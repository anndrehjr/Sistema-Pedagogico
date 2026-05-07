"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ALL_CLASSROOMS,
  getPedagogicalColor,
  PEDAGOGICAL_LEVELS,
  type ClassRoom,
} from "@/lib/school-data";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";

type HeatmapProps = {
  selectedClassroom?: ClassRoom | null;
  onClassroomChange?: (classroom: ClassRoom | null) => void;
};

export function PedagogicalHeatmap({ selectedClassroom, onClassroomChange }: HeatmapProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    selectedClassroom?.id || ALL_CLASSROOMS[0].id
  );
  const [showNames, setShowNames] = useState(false);

  const currentClassroom =
    selectedClassroom ||
    ALL_CLASSROOMS.find((c) => c.id === internalSelectedId) ||
    ALL_CLASSROOMS[0];

  const handleChange = (value: string) => {
    setInternalSelectedId(value);
    const classroom = ALL_CLASSROOMS.find((c) => c.id === value) || null;
    onClassroomChange?.(classroom);
  };

  const activeStudents = currentClassroom.students.filter((s) =>
    Object.values(s.grades).some((g) => typeof g === "number")
  );

  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Heatmap Pedagogico</CardTitle>
            <CardDescription className="text-base">
              Visao detalhada do desempenho de cada aluno por disciplina
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={showNames ? "default" : "outline"}
              size="sm"
              onClick={() => setShowNames(!showNames)}
              className="gap-2"
            >
              {showNames ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showNames ? "Ocultar Nomes" : "Mostrar Nomes"}
            </Button>
            <Select value={currentClassroom.id} onValueChange={handleChange}>
              <SelectTrigger className="w-[200px] text-base">
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {ALL_CLASSROOMS.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id} className="text-base">
                    {classroom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[60px] border-2 border-border bg-card p-2 text-center font-semibold text-muted-foreground">
                  #
                </th>
                {showNames && (
                  <th className="sticky left-[60px] z-10 min-w-[180px] border-2 border-border bg-card p-2 text-left font-semibold text-muted-foreground">
                    Nome
                  </th>
                )}
                {currentClassroom.subjects.map((subject) => (
                  <th
                    key={subject.code}
                    className="min-w-[50px] border-2 border-border bg-card p-2 text-center font-semibold text-muted-foreground"
                    title={subject.name}
                  >
                    {subject.code.replace("C", "")}
                  </th>
                ))}
                <th className="min-w-[60px] border-2 border-border bg-card p-2 text-center font-semibold text-muted-foreground">
                  Media
                </th>
              </tr>
            </thead>
            <tbody>
              {activeStudents.map((student, index) => {
                const grades = Object.values(student.grades).filter(
                  (g): g is number => typeof g === "number"
                );
                const avg = grades.length > 0
                  ? grades.reduce((a, b) => a + b, 0) / grades.length
                  : 0;

                return (
                  <tr key={student.id} className={student.isAttention ? "bg-critical/5" : ""}>
                    <td
                      className={`sticky left-0 z-10 border-2 border-border p-2 text-center text-base font-bold ${
                        student.isAttention ? "bg-critical/10 text-critical" : "bg-card"
                      }`}
                    >
                      {index + 1}
                    </td>
                    {showNames && (
                      <td
                        className={`sticky left-[60px] z-10 border-2 border-border p-2 text-sm font-medium ${
                          student.isAttention ? "bg-critical/10 text-critical" : "bg-card"
                        }`}
                      >
                        {student.name}
                      </td>
                    )}
                    {currentClassroom.subjects.map((subject) => {
                      const grade = student.grades[subject.code];
                      const isNumber = typeof grade === "number";

                      return (
                        <td
                          key={subject.code}
                          className="border-2 border-border p-2 text-center text-base font-bold"
                          style={{
                            backgroundColor: isNumber
                              ? `${getPedagogicalColor(grade)}30`
                              : "transparent",
                            color: isNumber
                              ? getPedagogicalColor(grade)
                              : "hsl(var(--muted-foreground))",
                          }}
                        >
                          {isNumber ? grade : "TR"}
                        </td>
                      );
                    })}
                    <td
                      className="border-2 border-border p-2 text-center text-lg font-bold"
                      style={{
                        backgroundColor: `${getPedagogicalColor(Math.round(avg))}30`,
                        color: getPedagogicalColor(Math.round(avg)),
                      }}
                    >
                      {avg.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            {Object.entries(PEDAGOGICAL_LEVELS).map(([key, level]) => (
              <div key={key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <div className="h-5 w-5 rounded" style={{ backgroundColor: level.color }} />
                <span className="text-sm font-bold text-foreground">
                  {level.min}-{level.max}
                </span>
                <span className="text-sm text-muted-foreground">{level.label}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border-2 border-critical/30 bg-critical/10 px-4 py-2 text-sm font-bold text-critical">
            Linhas destacadas = Ponto de Atencao
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border p-3">
          <p className="text-sm font-bold text-muted-foreground">Legenda das disciplinas:</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {currentClassroom.subjects.map((s) => (
              <span key={s.code} className="rounded border border-border px-2 py-1">
                <strong>{s.code.replace("C", "")}:</strong> {s.name}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
