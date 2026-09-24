"use client";

type Props = {
  current: number;
};

const steps = [
  "İşletme Bilgileri",
  "Hizmet Bilgileri",
  "Doğrulama",
  "Faturalama",
];

export function RegistrationProgress({ current }: Props) {
  return (
    <div className="mb-5 w-full px-1">
      <div className="flex items-start">
        {steps.map((label, index) => {
          const step = index + 1;
          const completed = step < current;
          const active = step === current;

          return (
            <div
              key={label}
              className="relative flex min-w-0 flex-1 flex-col items-center"
            >
              {index > 0 ? (
                <div
                  className={[
                    "absolute right-1/2 top-[15px] h-[3px] w-full rounded-full",
                    step <= current ? "bg-orange-500" : "bg-stone-200",
                  ].join(" ")}
                />
              ) : null}

              <div
                className={[
                  "relative z-10 grid size-8 place-items-center rounded-full border-2 text-[11px] font-bold",
                  completed
                    ? "border-orange-500 bg-orange-500 text-white"
                    : active
                      ? "border-orange-500 bg-white text-orange-600"
                      : "border-stone-300 bg-white text-stone-400",
                ].join(" ")}
                aria-current={active ? "step" : undefined}
              >
                {completed || active ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                ) : (
                  step
                )}
              </div>

              <span
                className={[
                  "mt-1.5 truncate text-center text-[9px] font-semibold sm:text-[10px]",
                  completed || active
                    ? "text-orange-700"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}