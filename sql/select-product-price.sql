    SELECT prices.product_price AS `price`
      FROM j25_virtuemart_product_prices AS `prices`
     WHERE prices.virtuemart_product_id = ?
