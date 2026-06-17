import { Skeleton } from "../../../../ui-kit";

export function GroupedBarChartSkeleton() {
  function BarGroup({ data }: { data: [number, number] }) {
    return (
      <div className="flex gap-2 items-end">
        <Skeleton height={data[0]} className="w-10 rounded-t-sm" />
        <Skeleton height={data[1]} className="w-10 rounded-t-sm" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="w-3! h-40! rounded-lg!" />
      <div className="h-80 flex flex-col grow">
        <div className="flex grow justify-evenly items-end relative border-l border-r border-b border-border ">
          <div className="border border-dashed translate-y-4 border-border w-full absolute top-0" />
          <div className="border border-dashed translate-y-4 border-border w-full absolute top-1/4" />
          <div className="border border-dashed translate-y-4 border-border w-full absolute top-1/2" />
          <div className="border border-dashed translate-y-4 border-border w-full absolute top-3/4" />

          {[
            [245, 180],
            [120, 260],
            [290, 140],
            [210, 300],
            [160, 110],
            [275, 220],
            [190, 250],
            [300, 170],
          ].map((item) => (
            <BarGroup data={item as any} />
          ))}
        </div>
        <Skeleton className="h-3! min-h-3! w-40! rounded-lg! self-center! mt-4" />
      </div>
      <Skeleton className="w-3! h-40! rounded-lg!" />
    </div>
  );
}