var fs = require('fs')
var config = require('config')
var async = require('async')
var mongo = require('mongodb')
var mysql = require('mysql')
var moment = require('moment')
var slug = require('./slug')

mongo.MongoClient.connect(config.mongo, function (er, mongoConn) {
  if (er) throw er

  var mysqlConn = mysql.createConnection(config.mysql)

  async.waterfall([
    function (cb) {
      query('select-categories', mysqlConn, function (er, categories) {
        console.log(categories.length, 'categories found')
        cb(er, categories)
      })
    },
    function (categories, cb) {
      query('select-products', mysqlConn, function (er, products) {
        console.log(products.length, 'published products found')
        cb(er, products, categories)
      })
    },
    function (products, categories, cb) {
      fillProductCategories(products, mysqlConn, function (er, products) {
        console.log(products.length, 'product categories filled')
        cb(er, products, categories)
      })
    },
    function (products, categories, cb) {
      fillProductPrices(products, mysqlConn, function (er, products) {
        console.log(products.length, 'product prices filled')
        cb(er, products, categories)
      })
    },
    function (allProds, allCats, cb) {
      filterClasses(allProds, mysqlConn, function (er, allClasses) {
        console.log(allClasses.length, 'classes found')
        cb(er, allClasses, allProds, allCats)
      })
    },
    function (allClasses, allProds, allCats, cb) {
      var classes = filterFutureClasses(allClasses)
      console.log(classes.length, 'class names parsed for date/time info')
      cb(er, classes, allClasses, allProds, allCats)
    },
    function (classes, allClasses, allProds, allCats, cb) {
      var products = filterProducts(allClasses, allProds)
      console.log(products.length, 'products found')
      cb(er, products, classes)
    },
    function (products, classes, cb) {
      insertTags(products, classes, mongoConn, function (er, tags) {
        console.log(tags.length, 'tags inserted')
        cb(er, products, classes)
      })
    },
    function (products, classes, cb) {
      insertProducts(products, mongoConn, function (er, products) {
        console.log(products.length, 'products inserted')
        cb(er, products, classes)
      })
    },
    function (products, classes, cb) {
      insertClasses(classes, mongoConn, function (er, classes) {
        console.log(classes.length, 'classes inserted')
        cb(er, products, classes)
      })
    }
  ], function (er) {
    mongoConn.close()
    mysqlConn.destroy()
    if (er) throw er
    //console.log(products)
  })
})

// Augment each product with categories: [{id, name}]
function fillProductCategories (products, conn, cb) {
  var tasks = products.map(function (p) {
    return function (cb) {
      query('select-product-categories', conn, {values: [p.id]}, function (er, rows) {
        if (er) return cb(er)
        p.categories = rows
        cb(null, p)
      })
    }
  })

  async.parallel(tasks, cb)
}

// Augment each product with a price field
function fillProductPrices (products, conn, cb) {
  var tasks = products.map(function (p) {
    return function (cb) {
      query('select-product-price', conn, {values: [p.id]}, function (er, rows) {
        if (er) return cb(er)

        if (p.name == 'Fri 13th Nov  2015 - SCHOOL OF WOK SUPPERCLUB 6pm – 9.30pm') {
          p.price = 37.50
        } else {
          p.price = rows[0].price
        }

        cb(null, p)
      })
    }
  })

  async.parallel(tasks, cb)
}

// Get the products that are actually classes
function filterClasses (products, conn, cb) {
  query('select-class-categories', conn, function (er, cats) {
    if (er) return cb(er)

    var classes = products.reduce(function (classes, p) {
      var isClass = cats.some(function (cat) {
        return p.categories.some(function (c) {
          return c.id == cat.id
        })
      })

      if (isClass) {
        classes.push(p)
      }

      return classes
    }, [])

    cb(null, classes)
  })
}

// Get the classes in the future
function filterFutureClasses (classes) {
  var now = moment()

  return classes.reduce(function (classes, c) {
    var name = c.name.trim()

    name = name.replace(/^(mon )|(tue )|(wed )|(thu )|(fri )|(sat )|(saturday )/i, '')

    //console.log(name)

    var date = moment(name, 'Do MMM YYYY')

    if (!date.isValid()) {
      console.error('Ignoring class (invalid date)', name)
      return classes
    }
    if (date.isBefore(now)) return classes

    try {
      var timeInfo = getTimeInfo(name)
      c.duration = timeInfo.duration
      c.date = timeInfo.date
    } catch (er) {
      console.error('Ignoring class (invalid time)', name)
      return classes
    }

    return classes.concat(c)
  }, [])
}

function getTimeInfo (name) {
  var timeRegex = /([0-9]?[0-9](\.[0-9][0-9])?[ap]m) *[-–] *([0-9]?[0-9](\.[0-9][0-9])?[ap]m)/ig
  var matches = timeRegex.exec(name)

  if (!matches) throw new Error('Failed to extract time info from class name')

  var startDate = moment(name, 'Do MMM YYYY')
  var startStr = matches[1], startTime

  if (startStr.indexOf('.') == -1) {
    startTime = moment(startStr, 'hhA')
  } else {
    startTime = moment(startStr, 'hh.mmA')
  }

  startDate.hour(startTime.hour())
  startDate.minute(startTime.minute())

  var endDate = startDate.clone()
  var endStr = matches[3], endTime

  if (endStr.indexOf('.') == -1) {
    endTime = moment(endStr, 'hhA')
  } else {
    endTime = moment(endStr, 'hh.mmA')
  }

  endDate.hour(endTime.hour())
  endDate.minute(endTime.minute())

  return {
    date: startDate.toDate(),
    duration: ((((endDate.valueOf() - startDate.valueOf()) / 1000) / 60) / 60) + ' hours'
  }
}

function filterProducts (allClasses, allProds) {
  function indexOf (item, arr, comparator) {
    for (var i = 0; i < arr.length; i++) {
      if (comparator(item, arr[i])) return i
    }
    return -1
  }

  // Filter out classes
  var products = allProds.filter(function (p) {
    var index = indexOf(p, allClasses, function (a, b) {
      return a.id == b.id
    })
    return index == -1
  })

  // Filter out vouchers
  products = products.filter(function (p) {
    return p.name.toLowerCase().indexOf('voucher') == -1
  })

  return products
}

function insertTags (classes, products, conn, cb) {
  var ClassTag = conn.collection('classtags')

  var tasks = classes.concat(products).reduce(function (tasks, c) {
    return tasks.concat(c.categories.map(function (cat) {
      return function (cb) {
        ClassTag.insert({name: cat.name}, cb)
      }
    }))
  }, [])

  async.parallel(tasks, cb)
}

function insertClasses (classes, conn, cb) {
  var Class = conn.collection('classes')

  var tasks = classes.map(function (c) {
    return function (cb) {
      Class.insert({
        name: c.name,
        slug: slug(c.name),
        intro: c.intro,
        desc: c.desc,
        tags: c.categories.map(function (cat) {
          return cat.name
        }),
        published: true,
        duration: c.duration,
        date: c.date,
        price: c.price,
        capacity: c.stock,
        stock: c.stock
      }, cb)
    }
  })

  async.parallel(tasks, cb)
}

function insertProducts (products, conn, cb) {
  var Product = conn.collection('products')

  var tasks = products.map(function (c) {
    return function (cb) {
      Product.insert({
        name: c.name,
        slug: slug(c.name),
        intro: c.intro,
        desc: c.desc,
        tags: c.categories.map(function (cat) {
          return cat.name
        }),
        published: true,
        price: c.price,
        stock: c.stock
      }, cb)
    }
  })

  async.parallel(tasks, cb)
}

function query (name, conn, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }

  opts = opts || {}

  //console.log('query', name, opts)

  fs.readFile(__dirname + '/sql/' + name + '.sql', 'utf8', function (er, query) {
    if (er) return cb(er)
    conn.query(query, opts.values || [], cb)
  })
}
