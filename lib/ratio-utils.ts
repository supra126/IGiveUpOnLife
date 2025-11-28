import { ImageRatio } from "@/types";

/**
 * Get CSS color classes for ratio badges (with border)
 */
export const getRatioColor = (ratio: ImageRatio): string => {
  switch (ratio) {
    case "1:1":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "1:1-commercial":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "9:16":
      return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    case "4:5":
      return "bg-pink-500/20 text-pink-300 border-pink-500/30";
    case "16:9":
      return "bg-green-500/20 text-green-300 border-green-500/30";
    default:
      return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  }
};

/**
 * Get CSS aspect ratio classes for containers
 */
export const getRatioClass = (ratio: ImageRatio): string => {
  switch (ratio) {
    case "1:1":
      return "aspect-square";
    case "1:1-commercial":
      return "aspect-square";
    case "9:16":
      return "aspect-[9/16]";
    case "4:5":
      return "aspect-[4/5]";
    case "16:9":
      return "aspect-[16/9]";
    default:
      return "aspect-square";
  }
};
