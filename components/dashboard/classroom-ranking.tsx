"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getClassroomRanking,
  getPedagogicalDistribution,
  PEDAGOGICAL_LEVELS,
} from "@/lib/school-data";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

export function ClassroomRanking() {
  const ranking = getClassroomRanking();

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-warning" />;
    if (index === ranking.length - 1)
      return <TrendingDown className="h-5 w-5 text-critical" />;
    if (index <= 2) return <TrendingUp className="h-5 w-5 text-success" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  const getAverageColor = (avg: number) => {
    if (avg >= 7) return "text-success";
    if (avg >= 5) return "text-warning";
    return "text-critical";
  };

  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Ranking de Turmas</CardTitle>
        <CardDescription className="text-base">Classificacao por media geral do 1o Bimestre</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ranking.map((item, index) => {
            const dist = getPedagogicalDistribution(item.classroom);
            const total = dist.critical + dist.basic + dist.adequate + dist.advanced;
            
            return (
              <div
                key={item.classroom.id}
                className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-colors ${
                  index === 0 ? "border-success/50 bg-success/5" : ""
                } ${
                  index === ranking.length - 1 ? "border-critical/50 bg-critical/5" : ""
                } ${
                  index !== 0 && index !== ranking.length - 1 ? "border-border" : ""
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg font-bold">
                  {index + 1}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {getRankIcon(index)}
                    <span className="text-lg font-semibold">{item.classroom.name}</span>
                    <span className="rounded border border-border px-2 py-0.5 text-sm text-muted-foreground">
                      {item.classroom.level === "EF" ? "Fundamental" : "Medio"}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className="text-muted-foreground">
                      <strong>{item.classroom.totalActive}</strong> alunos
                    </span>
                    <span className="text-critical">
                      <strong>{dist.critical}</strong> criticos
                    </span>
                    <span className="text-success">
                      <strong>{dist.adequate + dist.advanced}</strong> adequados+
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-3xl font-bold ${getAverageColor(item.average)}`}>
                    {item.average.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">media</div>
                </div>

                <div className="hidden w-40 sm:block">
                  <div className="flex h-4 overflow-hidden rounded-full border border-border">
                    <div
                      className="transition-all"
                      style={{
                        width: `${(dist.critical / total) * 100}%`,
                        backgroundColor: PEDAGOGICAL_LEVELS.critical.color,
                      }}
                    />
                    <div
                      className="transition-all"
                      style={{
                        width: `${(dist.basic / total) * 100}%`,
                        backgroundColor: PEDAGOGICAL_LEVELS.basic.color,
                      }}
                    />
                    <div
                      className="transition-all"
                      style={{
                        width: `${(dist.adequate / total) * 100}%`,
                        backgroundColor: PEDAGOGICAL_LEVELS.adequate.color,
                      }}
                    />
                    <div
                      className="transition-all"
                      style={{
                        width: `${(dist.advanced / total) * 100}%`,
                        backgroundColor: PEDAGOGICAL_LEVELS.advanced.color,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs font-semibold">
                    <span style={{ color: PEDAGOGICAL_LEVELS.critical.color }}>{dist.critical}</span>
                    <span style={{ color: PEDAGOGICAL_LEVELS.basic.color }}>{dist.basic}</span>
                    <span style={{ color: PEDAGOGICAL_LEVELS.adequate.color }}>{dist.adequate}</span>
                    <span style={{ color: PEDAGOGICAL_LEVELS.advanced.color }}>{dist.advanced}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
