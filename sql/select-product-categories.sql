    SELECT cats.virtuemart_category_id AS `id`,
           catnames.category_name AS `name`
      FROM j25_virtuemart_product_categories AS cats
 LEFT JOIN j25_virtuemart_categories_en_gb AS catnames
        ON catnames.virtuemart_category_id = cats.virtuemart_category_id
     WHERE cats.virtuemart_product_id = ?
