import { cn } from "@/utils";

export interface MapDot {
  key: string;
  latitude: number;
  longitude: number;
  /** Small, medium or large dot. */
  size: "low" | "medium" | "high";
  /** Groups dots by colour (e.g. a disease); `groupLabel` names it in the legend. */
  group: string;
  groupLabel: string;
  title: string;
  dashed?: boolean;
}

const COLORS = [
  "#f04438",
  "#f79009",
  "#7a5af8",
  "#0ba5ec",
  "#12b76a",
  "#ee46bc",
];
const RADIUS = { high: 14, medium: 10, low: 6 } as const;

/** Offline dot map of Ethiopia on a longitude/latitude grid (woreda or zone centres; no map tiles needed). */
export default function DotMap({
  dots,
  label,
  className,
}: {
  dots: MapDot[];
  label: string;
  className?: string;
}) {
  const W = 600;
  const H = 440;
  const [lon0, lon1, lat0, lat1] = [32.8, 48.2, 3.2, 15.0];
  const x = (lon: number) => ((lon - lon0) / (lon1 - lon0)) * W;
  const y = (lat: number) => H - ((lat - lat0) / (lat1 - lat0)) * H;
  const groups = [...new Set(dots.map((d) => d.group))];
  const color = (g: string) => COLORS[groups.indexOf(g) % COLORS.length];

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={cn("w-full rounded-xl bg-gray-50 dark:bg-white/[0.02]")}
        role="img"
        aria-label={label}
      >
        {[34, 38, 42, 46].map((lon) => (
          <g key={lon}>
            <line
              x1={x(lon)}
              x2={x(lon)}
              y1={0}
              y2={H}
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-800"
            />
            <text
              x={x(lon) + 3}
              y={H - 4}
              fontSize="10"
              className="fill-gray-400"
            >
              {lon}°E
            </text>
          </g>
        ))}
        {[5, 8, 11, 14].map((lat) => (
          <g key={lat}>
            <line
              y1={y(lat)}
              y2={y(lat)}
              x1={0}
              x2={W}
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-800"
            />
            <text x={3} y={y(lat) - 3} fontSize="10" className="fill-gray-400">
              {lat}°N
            </text>
          </g>
        ))}
        {dots.map((d) => (
          <circle
            key={d.key}
            cx={x(d.longitude)}
            cy={y(d.latitude)}
            r={RADIUS[d.size]}
            fill={color(d.group)}
            fillOpacity={0.55}
            stroke={color(d.group)}
            strokeDasharray={d.dashed ? "3 2" : undefined}
          >
            <title>{d.title}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-theme-xs text-gray-600 dark:text-gray-400">
        {groups.map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: color(g) }}
            />
            {dots.find((d) => d.group === g)?.groupLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
