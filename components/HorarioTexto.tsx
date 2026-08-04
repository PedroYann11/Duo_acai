"use client";

import { resumoHorario, useSettings } from "@/lib/settings-context";

/** Texto do horário de funcionamento, sempre igual ao configurado no admin */
export function HorarioTexto() {
  const { config } = useSettings();
  return <>{resumoHorario(config)}</>;
}
