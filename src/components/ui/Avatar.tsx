import clsx from "clsx";

type AvatarProps = {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
};

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-[52px] w-[52px]",
};

export function Avatar({ src, alt, size = "md", ring }: AvatarProps) {
  return (
    <div
      className={clsx(
        "shrink-0 overflow-hidden rounded-full bg-brand-bg",
        sizeMap[size],
        ring && "ring-2 ring-brand-line ring-offset-2 ring-offset-brand-surface"
      )}
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}
