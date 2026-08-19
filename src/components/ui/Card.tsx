import clsx from "clsx";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
};

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={clsx(
        "surface-premium rounded-2xl",
        padding && "p-0",
        className
      )}
    >
      {children}
    </div>
  );
}

type CardHeaderProps = {
  title: string;
  action?: React.ReactNode;
};

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-brand-line px-6 py-4">
      <h2 className="text-display text-[15px]">{title}</h2>
      {action}
    </div>
  );
}
