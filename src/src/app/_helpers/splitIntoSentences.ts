import tokenizer from "sbd";

export const splitIntoSentences = (text: string): string[] => {
  const abbreviations = [
    "Mr",
    "Mrs",
    "Ms",
    "Dr",
    "Prof",
    "Sr",
    "Jr",
    "i.e",
    "e.g",
    "a.m",
    "p.m",
    "A.M",
    "P.M",
    "Ph.D",
    "M.D",
    "B.A",
    "M.A",
    "B.Sc",
    "M.Sc",
    "St",
    "Ave",
    "Rd",
    "Blvd",
    "Inc",
    "Ltd",
    "Co",
    "Corp",
    "vs",
  ];

  return tokenizer.sentences(text, {
    abbreviations,
  });
};
