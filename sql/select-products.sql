   SELECT a.virtuemart_product_id AS `id`,
          a.product_name AS `name`,
          a.product_s_desc AS `intro`,
          a.product_desc AS `desc`,
          b.product_in_stock AS `stock`,
          c.product_price AS `price`
     FROM j25_virtuemart_products_en_gb AS a
LEFT JOIN j25_virtuemart_products AS b
       ON a.virtuemart_product_id = b.virtuemart_product_id
      AND b.published = 1
LEFT JOIN j25_virtuemart_product_prices AS c
       ON a.virtuemart_product_id = c.virtuemart_product_id
