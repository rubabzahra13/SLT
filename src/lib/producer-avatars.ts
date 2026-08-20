/** Curated DiceBear avataaars with varied skin tones and presentation. */
export type ProducerAvatarOption = {
  id: string;
  label: string;
  src: string;
};

function avatar(seed: string, params: Record<string, string>): string {
  const q = new URLSearchParams({ seed, ...params });
  return `https://api.dicebear.com/9.x/avataaars/svg?${q.toString()}`;
}

export const PRODUCER_AVATARS: ProducerAvatarOption[] = [
  {
    id: "ava-1",
    label: "Light · long hair",
    src: avatar("Maya", {
      skinColor: "ffdbb4",
      topVariant: "straight01",
      hairColor: "2c1b18",
      eyesVariant: "happy",
    }),
  },
  {
    id: "ava-2",
    label: "Light · short hair",
    src: avatar("Chris", {
      skinColor: "ffdbb4",
      topVariant: "shortFlat",
      hairColor: "4a312c",
      facialHairVariant: "beardLight",
      facialHairProbability: "100",
      facialHairColor: "4a312c",
    }),
  },
  {
    id: "ava-3",
    label: "Fair · bob",
    src: avatar("Elena", {
      skinColor: "edb98a",
      topVariant: "bob",
      hairColor: "b58143",
      eyesVariant: "default",
    }),
  },
  {
    id: "ava-4",
    label: "Fair · buzz",
    src: avatar("Jordan", {
      skinColor: "edb98a",
      topVariant: "theCaesar",
      hairColor: "2c1b18",
    }),
  },
  {
    id: "ava-5",
    label: "Medium · waves",
    src: avatar("Priya", {
      skinColor: "d08b5b",
      topVariant: "curly",
      hairColor: "2c1b18",
      eyesVariant: "side",
    }),
  },
  {
    id: "ava-6",
    label: "Medium · short",
    src: avatar("Omar", {
      skinColor: "d08b5b",
      topVariant: "shortWaved",
      hairColor: "2c1b18",
      facialHairVariant: "moustacheMagnum",
      facialHairProbability: "100",
      facialHairColor: "2c1b18",
    }),
  },
  {
    id: "ava-7",
    label: "Tan · ponytail",
    src: avatar("Sofia", {
      skinColor: "ae5d29",
      topVariant: "straight02",
      hairColor: "724133",
      eyesVariant: "happy",
    }),
  },
  {
    id: "ava-8",
    label: "Tan · fade",
    src: avatar("Marcus", {
      skinColor: "ae5d29",
      topVariant: "shortCurly",
      hairColor: "2c1b18",
    }),
  },
  {
    id: "ava-9",
    label: "Deep · braids",
    src: avatar("Aisha", {
      skinColor: "614335",
      topVariant: "curvy",
      hairColor: "2c1b18",
      eyesVariant: "default",
    }),
  },
  {
    id: "ava-10",
    label: "Deep · short",
    src: avatar("Darius", {
      skinColor: "614335",
      topVariant: "dreads01",
      hairColor: "2c1b18",
      facialHairVariant: "beardMedium",
      facialHairProbability: "100",
      facialHairColor: "2c1b18",
    }),
  },
  {
    id: "ava-11",
    label: "Deep · hijab",
    src: avatar("Layla", {
      skinColor: "614335",
      topVariant: "hijab",
      hatColor: "262e33",
      eyesVariant: "happy",
    }),
  },
  {
    id: "ava-12",
    label: "Medium · hijab",
    src: avatar("Noor", {
      skinColor: "d08b5b",
      topVariant: "hijab",
      hatColor: "65c9ff",
    }),
  },
  {
    id: "ava-13",
    label: "Fair · bun",
    src: avatar("Hana", {
      skinColor: "edb98a",
      topVariant: "bun",
      hairColor: "2c1b18",
    }),
  },
  {
    id: "ava-14",
    label: "Light · sides",
    src: avatar("Sam", {
      skinColor: "ffdbb4",
      topVariant: "sides",
      hairColor: "e8e1e1",
      clothesVariant: "shirtCrewNeck",
      clothesColor: "3c4f5c",
    }),
  },
  {
    id: "ava-15",
    label: "Tan · long",
    src: avatar("Wei", {
      skinColor: "ae5d29",
      topVariant: "straightAndStrand",
      hairColor: "2c1b18",
    }),
  },
  {
    id: "ava-16",
    label: "Deep · shaved",
    src: avatar("Kwame", {
      skinColor: "614335",
      topVariant: "shavedSides",
      facialHairVariant: "beardMajestic",
      facialHairProbability: "100",
      facialHairColor: "2c1b18",
    }),
  },
];

export function defaultAvatarSrc(): string {
  return PRODUCER_AVATARS[0].src;
}
