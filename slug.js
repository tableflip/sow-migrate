// slug generator from https://github.com/mindblaze/mongoose-url-slugs
module.exports = function (text, separator) {
  separator = separator || '-'

  var slug = text.toLowerCase().replace(/([^a-z0-9\-\_]+)/g, separator).replace(new RegExp(separator + '{2,}', 'g'), separator)

  if (slug.substr(-1) == separator) {
    slug = slug.substr(0, slug.length-1)
  }

  return slug
}