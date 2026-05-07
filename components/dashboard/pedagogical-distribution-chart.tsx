"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ALL_CLASSROOMS,
  getPedagogicalDistribution,
  PEDAGOGICAL_LEVELS,
  type ClassRoom,
} from "@/lib/school-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from "recharts";

type ChartProps = {
  selectedClassroom?: ClassRoom | null;
};

// Custom Legend Component para melhor visibilidade em TV
function CustomLegend({ items }: { items: { name: string; color: string; value: number }[] }) {
  const total = items.reduce((acc, item) => acc + item.value, 0);
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2">
          <div
            className="h-5 w-5 rounded"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm font-bold text-foreground">{item.name}</span>
          <span className="text-lg font-bold" style={{ color: item.color }}>
            {item.value}
          </span>
          <span className="text-sm text-muted-foreground">
            ({((item.value / total) * 100).toFixed(0)}%)
          </span>
        </div>
      ))}
    </div>
  );
}

export function PedagogicalDistributionChart({ selectedClassroom }: ChartProps) {
  const data = selectedClassroom
    ? [
        {
          name: selectedClassroom.name,
          ...getPedagogicalDistribution(selectedClassroom),
        },
      ]
    : ALL_CLASSROOMS.map((classroom) => ({
        name: classroom.name.replace("º Ano", "º").replace("ª Série", "ª"),
        ...getPedagogicalDistribution(classroom),
      }));

  const totals = selectedClassroom
    ? getPedagogicalDistribution(selectedClassroom)
    : ALL_CLASSROOMS.reduce(
        (acc, classroom) => {
          const dist = getPedagogicalDistribution(classroom);
          acc.critical += dist.critical;
          acc.basic += dist.basic;
          acc.adequate += dist.adequate;
          acc.advanced += dist.advanced;
          return acc;
        },
        { critical: 0, basic: 0, adequate: 0, advanced: 0 }
      );

  const pieData = Object.entries(totals).map(([key, value]) => ({
    name: PEDAGOGICAL_LEVELS[key as keyof typeof PEDAGOGICAL_LEVELS].label,
    value,
    color: PEDAGOGICAL_LEVELS[key as keyof typeof PEDAGOGICAL_LEVELS].color,
  }));

  const legendItems = [
    { name: "Critico (1-4)", color: PEDAGOGICAL_LEVELS.critical.color, value: totals.critical },
    { name: "Basico (5-6)", color: PEDAGOGICAL_LEVELS.basic.color, value: totals.basic },
    { name: "Adequado (7-8)", color: PEDAGOGICAL_LEVELS.adequate.color, value: totals.adequate },
    { name: "Avancado (9-10)", color: PEDAGOGICAL_LEVELS.advanced.color, value: totals.advanced },
  ];

  const totalAlunos = totals.critical + totals.basic + totals.adequate + totals.advanced;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Distribuicao Pedagogica por Turma</CardTitle>
          <CardDescription className="text-base">
            Quantidade de alunos em cada nivel pedagogico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 14, fontWeight: 600 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fill: "hsl(var(--foreground))", fontSize: 14 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Bar
                dataKey="critical"
                name={PEDAGOGICAL_LEVELS.critical.label}
                stackId="a"
                fill={PEDAGOGICAL_LEVELS.critical.color}
              >
                <LabelList dataKey="critical" position="center" fill="#fff" fontSize={12} fontWeight={700} />
              </Bar>
              <Bar
                dataKey="basic"
                name={PEDAGOGICAL_LEVELS.basic.label}
                stackId="a"
                fill={PEDAGOGICAL_LEVELS.basic.color}
              >
                <LabelList dataKey="basic" position="center" fill="#000" fontSize={12} fontWeight={700} />
              </Bar>
              <Bar
                dataKey="adequate"
                name={PEDAGOGICAL_LEVELS.adequate.label}
                stackId="a"
                fill={PEDAGOGICAL_LEVELS.adequate.color}
              >
                <LabelList dataKey="adequate" position="center" fill="#000" fontSize={12} fontWeight={700} />
              </Bar>
              <Bar
                dataKey="advanced"
                name={PEDAGOGICAL_LEVELS.advanced.label}
                stackId="a"
                fill={PEDAGOGICAL_LEVELS.advanced.color}
              >
                <LabelList dataKey="advanced" position="center" fill="#fff" fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <CustomLegend items={legendItems} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">
            Visao Geral {selectedClassroom ? `- ${selectedClassroom.name}` : "da Escola"}
          </CardTitle>
          <CardDescription className="text-base">
            Total de {totalAlunos} alunos por nivel pedagogico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={110}
                fill="#8884d8"
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={3}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend items={legendItems} />
        </CardContent>
      </Card>
    </div>
  );
}
