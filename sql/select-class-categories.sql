   SELECT catcats.category_child_id AS `id`,
          cats.category_name AS `name`
     FROM j25_virtuemart_category_categories AS catcats
LEFT JOIN j25_virtuemart_categories_en_gb AS cats
       ON cats.virtuemart_category_id = catcats.category_child_id
    WHERE catcats.category_parent_id = 14
       OR catcats.category_child_id = 14
