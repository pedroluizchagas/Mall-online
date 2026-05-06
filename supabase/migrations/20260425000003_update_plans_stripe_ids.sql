UPDATE plans SET
  stripe_product_id = 'prod_UOyqp1ypcGLmki',
  stripe_price_id   = 'price_1TQAsnBlwIPRm64RXBDdD7mk'
WHERE nome = 'Básico';

UPDATE plans SET
  stripe_product_id = 'prod_UOysr0EqRr31K7',
  stripe_price_id   = 'price_1TQAunBlwIPRm64RlfrkAe03'
WHERE nome = 'Profissional';

UPDATE plans SET
  stripe_product_id = 'prod_UOyughVodsgF07',
  stripe_price_id   = 'price_1TQAwoBlwIPRm64Rlz3lfoLx'
WHERE nome = 'Premium';
