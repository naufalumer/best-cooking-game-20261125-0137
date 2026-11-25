// Dapur Sore — ingredients and dishes.
// One file, one job: what food exists, what it looks like, what it costs,
// and which steps turn raw stock into a dish worth serving.
export const INGREDIENTS = {
  bun: { name: 'Bun', colour: '#e8b96a', dark: '#c98f3d', prep: 'raw', canChop: false, canCook: false, shape: 'bun' },
  patty: { name: 'Patty', colour: '#8a5a33', dark: '#6b4223', prep: 'raw', canChop: false, canCook: true, shape: 'patty' },
  tomato: { name: 'Tomato', colour: '#e2483a', dark: '#b32d22', prep: 'raw', canChop: true, canCook: false, shape: 'tomato' },
  lettuce: { name: 'Lettuce', colour: '#7dc24a', dark: '#4f8f2a', prep: 'raw', canChop: true, canCook: false, shape: 'lettuce' },
  onion: { name: 'Onion', colour: '#c9a7e0', dark: '#9a6fc0', prep: 'raw', canChop: true, canCook: false, shape: 'onion' },
  noodle: { name: 'Noodle', colour: '#f2c14e', dark: '#d19a26', prep: 'raw', canChop: false, canCook: true, shape: 'noodle' },
  egg: { name: 'Egg', colour: '#fdf3d8', dark: '#e8d9a8', prep: 'raw', canChop: false, canCook: true, shape: 'egg' },
};

// A needed item is "id:state" — chopped, cooked, or raw as stocked.
export const DISHES = {
  burger: {
    name: 'Burger Sore',
    price: 18,
    weight: 3,
    needs: ['bun:raw', 'patty:cooked', 'tomato:chopped', 'lettuce:chopped'],
    blurb: 'the house burger',
  },
  mie: {
    name: 'Mie Goreng',
    price: 16,
    weight: 3,
    needs: ['noodle:cooked', 'egg:cooked', 'onion:chopped'],
    blurb: 'wok-fried noodles',
  },
  omelet: {
    name: 'Omelet Sayur',
    price: 13,
    weight: 2,
    needs: ['egg:cooked', 'tomato:chopped', 'onion:chopped'],
    blurb: 'garden omelette',
  },
  salad: {
    name: 'Salad Segar',
    price: 10,
    weight: 2,
    needs: ['tomato:chopped', 'lettuce:chopped', 'onion:chopped'],
    blurb: 'fresh and fast',
  },
};

export const DISH_IDS = Object.keys(DISHES);

// An item is { id, state } where state is raw | chopped | cooked | burnt.
export function itemKey(item) {
  return `${item.id}:${item.state}`;
}

export function needsKey(need) {
  return need;
}

// True when the plate's items, in any order, are exactly one dish's recipe.
export function dishMatchingPlate(plateItems) {
  const keys = plateItems.map(itemKey).sort();
  for (const dishId of DISH_IDS) {
    const wants = [...DISHES[dishId].needs].sort();
    if (keys.length === wants.length && keys.every((key, i) => key === wants[i])) return dishId;
  }
  return null;
}

// True when every item on the plate belongs to at least one dish that also
// wants the rest of the plate — i.e. the plate is still on a real recipe.
export function plateStillPossible(plateItems) {
  const keys = plateItems.map(itemKey);
  return DISH_IDS.some((dishId) => {
    const wants = [...DISHES[dishId].needs];
    return keys.every((key) => {
      const at = wants.indexOf(key);
      if (at === -1) return false;
      wants.splice(at, 1);
      return true;
    });
  });
}
