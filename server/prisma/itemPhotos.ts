// Product photos for the seeded items, keyed by item id. All are free to use under the Unsplash License
// (https://unsplash.com/license) and are loaded straight from Unsplash's image CDN, as Unsplash asks.
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&h=600&q=75`;

export const ITEM_PHOTOS: Record<string, string> = {
  // Snacks
  'item-parle-g': photo('photo-1544787219-7f47ccb76574'),
  'item-lays-classic': photo('photo-1760997707695-f0b5527e5de9'),
  'item-kurkure': photo('photo-1776178393311-a4618b481064'),
  'item-hide-seek': photo('photo-1499636136210-6f4ee915583e'),
  'item-haldiram-bhujia': photo('photo-1675081548482-94dc75fe4f21'),
  'item-dark-fantasy': photo('photo-1557310717-d6bea9f36682'),
  // Beverages
  'item-amul-kool': photo('photo-1634141510639-d691d86f47be'),
  'item-cold-coffee': photo('photo-1461023058943-07fcbe16d735'),
  'item-masala-chai': photo('photo-1761483281417-778013dc0177'),
  'item-frooti': photo('photo-1546173159-315724a31696'),
  'item-bisleri': photo('photo-1616118132534-381148898bb4'),
  'item-red-bull': photo('photo-1642532560930-77d5018c68f7'),
  // Stationery
  'item-a4-register': photo('photo-1612367980327-7454a7276aa7'),
  'item-classmate-notebook': photo('photo-1581431886211-6b932f8367f2'),
  'item-reynolds-pens': photo('photo-1673208125315-dcc5bd597c99'),
  'item-engg-drawing-kit': photo('photo-1764948620396-45f5b5fdd73e'),
  'item-casio-fx991': photo('photo-1574607383077-47ddc2dc51c4'),
  // Essentials
  'item-colgate': photo('photo-1693692273603-3b9e13789298'),
  'item-dettol-soap': photo('photo-1775210603565-37cc9269326f'),
  'item-surf-excel': photo('photo-1593095948071-474c5cc2989d'),
  'item-good-knight': photo('photo-1732967823139-d10c3daa6658'),
  'item-paracetamol': photo('photo-1584308666744-24d5c474f2ae'),
  // Food
  'item-maggi': photo('photo-1789989472877-0957bb0f804a'),
  'item-veg-sandwich': photo('photo-1528735602780-2552fd46c7af'),
  'item-aloo-paratha': photo('photo-1683533743190-89c9b19f9ea6'),
  'item-paneer-roll': photo('photo-1626700051175-6818013e1d4f'),
  'item-veg-thali': photo('photo-1742281257687-092746ad6021'),
};
