const numericOrMax = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

const musicianKey = (id) => {
  if (id == null || id === "") return null;
  return String(id);
};

const seatingOrderToMatrixLegacyZeroBased = (orden) => {
  if (orden == null || Number.isNaN(Number(orden))) {
    return { atril_num: null, lado: null };
  }
  const o = Math.trunc(Number(orden));
  if (o < 0) return { atril_num: null, lado: null };
  return {
    atril_num: Math.floor(o / 2) + 1,
    lado: o % 2,
  };
};

const seatingItemMatrixPosition = (item, fallbackIndex = 0) => {
  const fb = Number(fallbackIndex) || 0;

  const hasAtril =
    item?.atril_num != null && !Number.isNaN(Number(item.atril_num));
  const hasLado =
    item?.lado != null && !Number.isNaN(Number(item.lado));

  if (hasAtril) {
    const atril_num = Number(item.atril_num);
    return {
      atril_num,
      lado: hasLado ? Number(item.lado) : fb % 2,
    };
  }

  if (item?.orden != null && !Number.isNaN(Number(item.orden))) {
    return seatingOrderToMatrixLegacyZeroBased(Math.trunc(Number(item.orden)));
  }

  return {
    atril_num: Math.floor(fb / 2) + 1,
    lado: fb % 2,
  };
};

export const buildSeatingContainerRankMap = (containers = []) => {
  const map = new Map();
  (containers || []).forEach((container, index) => {
    const id = container?.id;
    if (id == null) return;
    map.set(String(id), {
      order: numericOrMax(container?.orden ?? index),
      id: numericOrMax(id),
      index,
    });
  });
  return map;
};

const compareRankTuples = (a, b) => {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const diff = numericOrMax(a[i]) - numericOrMax(b[i]);
    if (diff !== 0) return diff;
  }
  return 0;
};

export const seatingStringItemRankTuple = (
  item,
  containerRankMap = new Map(),
  fallbackIndex = 0,
) => {
  const containerRank = containerRankMap.get(String(item?.id_contenedor)) || {
    order: Number.MAX_SAFE_INTEGER,
    id: numericOrMax(item?.id_contenedor),
    index: Number.MAX_SAFE_INTEGER,
  };
  const pos = seatingItemMatrixPosition(item, fallbackIndex);
  return [
    containerRank.order,
    containerRank.index,
    containerRank.id,
    numericOrMax(pos.atril_num),
    numericOrMax(pos.lado),
    numericOrMax(item?.orden),
    numericOrMax(item?.id),
  ];
};

export const compareSeatingStringItemsByVisualPriority = (
  a,
  b,
  containerRankMap = new Map(),
  fallbackIndexA = 0,
  fallbackIndexB = 0,
) =>
  compareRankTuples(
    seatingStringItemRankTuple(a, containerRankMap, fallbackIndexA),
    seatingStringItemRankTuple(b, containerRankMap, fallbackIndexB),
  );

export const getDuplicateSeatingStringItemIds = (items = [], containers = []) => {
  const containerRankMap = buildSeatingContainerRankMap(containers);
  const byMusician = new Map();

  (items || []).forEach((item, index) => {
    const key = musicianKey(item?.id_musico);
    if (!key) return;

    const entry = {
      item,
      index,
      rank: seatingStringItemRankTuple(item, containerRankMap, index),
    };
    const current = byMusician.get(key);
    if (!current || compareRankTuples(entry.rank, current.rank) < 0) {
      entry.duplicateIds = [
        ...(current?.duplicateIds || []),
        ...(current?.item?.id != null ? [current.item.id] : []),
      ];
      byMusician.set(key, entry);
      return;
    }

    if (item?.id == null) return;
    current.duplicateIds = [...(current.duplicateIds || []), item.id];
  });

  return Array.from(byMusician.values())
    .flatMap((entry) => entry.duplicateIds || [])
    .filter((id) => id != null);
};

export const dedupeSeatingStringItems = (items = [], containers = []) => {
  const duplicateIds = new Set(getDuplicateSeatingStringItemIds(items, containers).map(String));
  return (items || []).filter((item) => {
    if (item?.id == null) return true;
    return !duplicateIds.has(String(item.id));
  });
};
