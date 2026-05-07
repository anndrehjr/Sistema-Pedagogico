"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClassroomRanking, PEDAGOGICAL_LEVELS } from "@/lib/school-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";

function getBarColor(avg: number) {
  if (avg >= 7) return PEDAGOGICAL_LEVELS.adequate.color;
  if (avg >= 5) return PEDAGOGICAL_LEVELS.basic.color;
  return PEDAGOGICAL_LEVELS.critical.color;
}

export function ClassroomAverageChart() {
  const ranking = getClassroomRanking();

  const data = ranking.map((item) => ({
    name: item.classroom.name.replace("º Ano", "º").replace("ª Série", "ª"),
    fullName: item.classroom.name,
    average: parseFloat(item.average.toFixed(1)),
    level: item.classroom.level,
  }));

  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Indice de Desempenho por Turma</CardTitle>
        <CardDescription className="text-base">
          Comparacao das medias gerais entre todas as turmas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 30, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 14, fontWeight: 600 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 14 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <ReferenceLine
              y={5}
              stroke={PEDAGOGICAL_LEVELS.basic.color}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "Minimo (5.0)",
                fill: PEDAGOGICAL_LEVELS.basic.color,
                fontSize: 13,
                fontWeight: 700,
                position: "right",
              }}
            />
            <ReferenceLine
              y={7}
              stroke={PEDAGOGICAL_LEVELS.adequate.color}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "Adequado (7.0)",
                fill: PEDAGOGICAL_LEVELS.adequate.color,
                fontSize: 13,
                fontWeight: 700,
                position: "right",
              }}
            />
            <Bar dataKey="average" radius={[8, 8, 0, 0]} maxBarSize={65}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.average)} />
              ))}
              <LabelList
                dataKey="average"
                position="top"
                fill="hsl(var(--foreground))"
                fontSize={16}
                fontWeight={700}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {data.map((item) => (
            <div
              key={item.name}
              className="flex flex-col items-center rounded-xl border-2 border-border p-3"
            >
              <span className="text-sm font-bold text-muted-foreground">{item.name}</span>
              <span
                className="mt-1 text-2xl font-bold"
                style={{ color: getBarColor(item.average) }}
              >
                {item.average}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
