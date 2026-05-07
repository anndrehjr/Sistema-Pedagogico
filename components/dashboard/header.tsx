"use client";

import { SCHOOL_INFO } from "@/lib/school-data";
import { GraduationCap, Calendar, MapPin, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Painel Analitico Educacional
              </h1>
              <p className="text-base text-muted-foreground">{SCHOOL_INFO.name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <MapPin className="h-5 w-5" />
              <span>{SCHOOL_INFO.city} - {SCHOOL_INFO.state}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-primary">
              <Calendar className="h-5 w-5" />
              <span className="text-lg font-semibold">
                {SCHOOL_INFO.bimester} / {SCHOOL_INFO.year}
              </span>
            </div>
            
            {mounted && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="gap-2 border-2"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-5 w-5" />
                    <span className="hidden sm:inline">Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-5 w-5" />
                    <span className="hidden sm:inline">Modo Escuro</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
