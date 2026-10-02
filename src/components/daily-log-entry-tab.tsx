
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// This component is deprecated. Its functionality has been merged into DailyReportTab.
export default function DailyLogEntryTab() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Funcionalidade Movida</CardTitle>
                <CardDescription>
                    Os apontamentos diários de mão de obra foram integrados diretamente no Diário de Obra.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Para lançar as horas e a produção da sua equipa, por favor, vá ao separador "Execução" e utilize a funcionalidade "Diário de Obras".
                </p>
            </CardContent>
        </Card>
    );
}
