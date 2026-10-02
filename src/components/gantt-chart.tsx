'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GanttChart as GanttChartIcon, 
  Loader2, 
  Diamond, 
  Search, 
  Calendar, 
  Clock, 
  GitBranch, 
  AlertTriangle, 
  Flame, 
  Bookmark, 
  Download, 
  Printer, 
  Plus,
  GitMerge,
  Layers,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Filter,
  MoveHorizontal,
  FolderKanban,
  Sparkles,
  CalendarRange,
  RotateCcw,
  Upload,
  Maximize2,
  Minimize2,
  Activity,
  FileCode,
  Users
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, Timestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { WbsItem, ActivityStatus } from '@/types/wbs';
import type { UserRole } from '@/types/project';
import { 
  eachDayOfInterval, 
  format, 
  differenceInDays, 
  startOfWeek, 
  addDays, 
  isAfter, 
  isBefore, 
  isToday, 
  startOfDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAngolaHoliday, isAngolaHoliday } from '@/lib/angola-holidays';
import { GanttTaskDialog } from './gantt/gantt-task-dialog';
import { GanttBaselineModal } from './gantt/gantt-baseline-modal';
import { GanttNewTaskDialog } from './gantt/gantt-new-task-dialog';
import { GanttCascadeModal } from './gantt/gantt-cascade-modal';
import { GanttSCurvePanel } from './gantt/gantt-s-curve-panel';
import { GanttWhatIfSimulator } from './gantt/gantt-whatif-simulator';
import { GanttLookaheadPanel } from './gantt/gantt-lookahead-panel';
import { exportToMsProjectXml } from '@/lib/gantt-xml-converter';
import { GanttImportModal } from './gantt/gantt-import-modal';
import { GanttResourceConflictsPanel } from './gantt/gantt-resource-conflicts-panel';
import { GanttPrintModal } from './gantt/gantt-print-modal';

interface GanttChartProps {
  projectId: string;
  userRole?: UserRole | null;
}

type ZoomLevel = 'days' | 'weeks' | 'months';

// SVG Arrow Marker Definition
const ArrowMarker = ({ id, color }: { id: string; color: string }) => (
  <marker
    id={id}
    viewBox="0 0 10 10"
    refX="8"
    refY="5"
    markerWidth="6"
    markerHeight="6"
    orient="auto-start-reverse"
  >
    <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
  </marker>
);

interface DraggingState {
  taskId: string;
  type: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  initialStart: Date;
  initialEnd: Date;
  deltaDays: number;
}

export default function GanttChart({ projectId, userRole }: GanttChartProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<WbsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais & Gavetas
  const [selectedTask, setSelectedTask] = useState<WbsItem | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [isCascadeModalOpen, setIsCascadeModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Metadados do Projeto para Carimbo Técnico & Dossiê
  const [projectInfo, setProjectInfo] = useState<{
    name: string;
    code?: string;
    clientName?: string;
    contractorName?: string;
    location?: string;
  }>({
    name: 'Empreitada de Engenharia',
    code: 'OBRA-2026',
    clientName: 'Governo / Entidade Contratante',
    contractorName: 'Consórcio Construtor',
    location: 'Angola',
  });

  // Painéis Expansíveis
  const [isSCurveOpen, setIsSCurveOpen] = useState(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [isLookaheadOpen, setIsLookaheadOpen] = useState(false);
  const [isConflictsOpen, setIsConflictsOpen] = useState(false);
  const [lookaheadDays, setLookaheadDays] = useState<14 | 28>(14);
  const [lookaheadFilterActive, setLookaheadFilterActive] = useState(false);

  // Simulação What-If
  const [simulatedShifts, setSimulatedShifts] = useState<Record<string, number>>({});

  // Agrupamento por Fases da EAP
  const [groupByPhase, setGroupByPhase] = useState(false);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});

  // Controles de Visualização
  const [zoom, setZoom] = useState<ZoomLevel>('days');
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showProgressLine, setShowProgressLine] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delayed' | 'in_progress' | 'completed' | 'critical' | 'milestones'>('all');

  // Dragging / Resizing State
  const [dragging, setDragging] = useState<DraggingState | null>(null);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const todayMarkerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  const canEdit = !userRole || ['Admin', 'Gestor', 'Engenheiro', 'Mestre de Obra'].includes(userRole);

  // Fullscreen Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Escala dinâmica de largura por dia
  const DAY_WIDTH = useMemo(() => {
    switch (zoom) {
      case 'days':
        return 30;
      case 'weeks':
        return 14;
      case 'months':
        return 6;
      default:
        return 30;
    }
  }, [zoom]);

  const ROW_HEIGHT = 44;

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    // 1. Escuta dados cadastrais do Projeto para Selo de Impressão e Cabeçalhos
    const unsubProject = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) {
        const pData = snap.data();
        setProjectInfo({
          name: pData.name || 'Empreitada de Engenharia',
          code: pData.code || 'OBRA-2026',
          clientName: pData.client || pData.clientName || 'Governo / Entidade Contratante',
          contractorName: pData.contractorName || 'Consórcio Construtor',
          location: typeof pData.location === 'string' ? pData.location : pData.location?.province || 'Angola',
        });
      }
    });

    // 2. Escuta itens da EAP / WBS
    const q = query(collection(db, 'projects', projectId, 'wbs'), orderBy('startDate'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTasks = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              startDate: data.startDate ? (data.startDate as Timestamp).toDate() : undefined,
              endDate: data.endDate ? (data.endDate as Timestamp).toDate() : undefined,
              baselineStartDate: data.baselineStartDate ? (data.baselineStartDate as Timestamp).toDate() : undefined,
              baselineEndDate: data.baselineEndDate ? (data.baselineEndDate as Timestamp).toDate() : undefined,
            } as WbsItem;
          })
          .filter((task) => task.startDate && task.endDate);
        setTasks(fetchedTasks);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching WBS for Gantt: ', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      unsubProject();
    };
  }, [projectId]);

  // Cálculo de CPM (Caminho Crítico), Folgas e Posicionamentos
  const {
    dateRange,
    tasksWithPositions,
    monthHeaders,
    ganttStart,
    ganttEnd,
    criticalPathIds,
    totalProjectDuration,
    earliestProjectStart,
    latestProjectEnd,
    totalSlackMap,
  } = useMemo(() => {
    if (tasks.length === 0) {
      return {
        dateRange: [],
        tasksWithPositions: [],
        monthHeaders: [],
        ganttStart: new Date(),
        ganttEnd: new Date(),
        criticalPathIds: new Set<string>(),
        totalProjectDuration: 0,
        earliestProjectStart: null,
        latestProjectEnd: null,
        totalSlackMap: new Map<string, number>(),
      };
    }

    const earliestProjectStart = tasks.reduce(
      (earliest, task) => (task.startDate && task.startDate < earliest ? task.startDate : earliest),
      tasks[0].startDate!
    );

    const latestProjectEnd = tasks.reduce(
      (latest, task) => (task.endDate && task.endDate > latest ? task.endDate : latest),
      tasks[0].endDate!
    );

    if (!earliestProjectStart || !latestProjectEnd || isAfter(earliestProjectStart, latestProjectEnd)) {
      return {
        dateRange: [],
        tasksWithPositions: [],
        monthHeaders: [],
        ganttStart: new Date(),
        ganttEnd: new Date(),
        criticalPathIds: new Set<string>(),
        totalProjectDuration: 0,
        earliestProjectStart: null,
        latestProjectEnd: null,
        totalSlackMap: new Map<string, number>(),
      };
    }

    // Intervalo geral com buffer de navegação
    const ganttStart = startOfWeek(earliestProjectStart, { weekStartsOn: 1 });
    const bufferDays = zoom === 'months' ? 90 : zoom === 'weeks' ? 45 : 30;
    const ganttEnd = addDays(startOfWeek(latestProjectEnd, { weekStartsOn: 1 }), bufferDays);

    const dateRange = eachDayOfInterval({ start: ganttStart, end: ganttEnd });

    // 1. Rede e Adjacências para CPM
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const adj: Record<string, string[]> = {};
    const revAdj: Record<string, string[]> = {};
    tasks.forEach((task) => {
      adj[task.id] = [];
      revAdj[task.id] = [];
    });
    tasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies.forEach((depId) => {
          if (taskMap.has(depId)) {
            adj[depId].push(task.id);
            revAdj[task.id].push(depId);
          }
        });
      }
    });

    // 2. Forward Pass: Earliest Start (ES) e Earliest Finish (EF)
    const earliestStart: Record<string, number> = {};
    const earliestFinish: Record<string, number> = {};
    const sortedNodes = [...tasks].sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());

    sortedNodes.forEach((task) => {
      const duration = task.startDate && task.endDate ? differenceInDays(task.endDate, task.startDate) + 1 : 0;
      if (!task.dependencies || task.dependencies.length === 0) {
        earliestStart[task.id] = 0;
      } else {
        earliestStart[task.id] = Math.max(...task.dependencies.map((depId) => earliestFinish[depId] || 0));
      }
      earliestFinish[task.id] = earliestStart[task.id] + duration;
    });

    const projectDuration = Math.max(0, ...Object.values(earliestFinish));

    // 3. Backward Pass: Latest Finish (LF) e Latest Start (LS)
    const latestFinish: Record<string, number> = {};
    const latestStart: Record<string, number> = {};
    const reverseSortedNodes = [...tasks].sort((a, b) => b.endDate!.getTime() - a.endDate!.getTime());

    reverseSortedNodes.forEach((task) => {
      const duration = task.startDate && task.endDate ? differenceInDays(task.endDate, task.startDate) + 1 : 0;
      if (!adj[task.id] || adj[task.id].length === 0) {
        latestFinish[task.id] = projectDuration;
      } else {
        latestFinish[task.id] = Math.min(
          ...adj[task.id].map((succId) => (latestStart[succId] === undefined ? Infinity : latestStart[succId]))
        );
      }
      latestStart[task.id] = latestFinish[task.id] - duration;
    });

    // 4. Folgas e Caminho Crítico (Total Float == 0)
    const criticalPathIds = new Set<string>();
    const totalSlackMap = new Map<string, number>();

    tasks.forEach((task) => {
      const float = Math.max(0, Math.round((latestStart[task.id] || 0) - (earliestStart[task.id] || 0)));
      totalSlackMap.set(task.id, float);
      if (float <= 0) {
        criticalPathIds.add(task.id);
      }
    });

    // 5. Posicionamentos no Grid
    const tasksWithPositions = tasks.map((task, index) => {
      const start = task.startDate!;
      const end = task.endDate!;
      const duration = task.isMilestone ? 0 : Math.max(1, differenceInDays(end, start) + 1);
      const offset = Math.max(0, differenceInDays(start, ganttStart));

      const baselineStart = task.baselineStartDate;
      const baselineEnd = task.baselineEndDate;
      const baselineDuration =
        baselineStart && baselineEnd && !task.isMilestone
          ? Math.max(1, differenceInDays(baselineEnd, baselineStart) + 1)
          : 0;
      const baselineOffset = baselineStart ? differenceInDays(baselineStart, ganttStart) : 0;

      let varianceDays = 0;
      if (baselineEnd && task.endDate) {
        varianceDays = differenceInDays(task.endDate, baselineEnd);
      }

      const totalSlack = totalSlackMap.get(task.id) || 0;
      const isCritical = criticalPathIds.has(task.id);

      return {
        ...task,
        totalSlack,
        isCritical,
        varianceDays,
        gantt: {
          duration,
          offset,
          rowIndex: index,
          baselineDuration,
          baselineOffset,
        },
      };
    });

    // 6. Cabeçalhos de Meses
    const months = eachDayOfInterval({ start: ganttStart, end: ganttEnd });
    const monthHeaders = months.reduce<{ name: string; offset: number; days: number }[]>((acc, day) => {
      const monthName = format(day, 'MMMM yyyy', { locale: ptBR });
      const existing = acc.find((m) => m.name === monthName);
      if (!existing) {
        const offset = differenceInDays(day, ganttStart);
        acc.push({ name: monthName, offset, days: 1 });
      } else {
        existing.days += 1;
      }
      return acc;
    }, []);

    const totalProjectDuration = differenceInDays(latestProjectEnd, earliestProjectStart) + 1;

    return {
      dateRange,
      tasksWithPositions,
      monthHeaders,
      ganttStart,
      ganttEnd,
      criticalPathIds,
      totalProjectDuration,
      earliestProjectStart,
      latestProjectEnd,
      totalSlackMap,
    };
  }, [tasks, zoom]);

  // Filtro Lookahead Ativo
  const lookaheadWindow = useMemo(() => {
    const today = startOfDay(new Date());
    const lookaheadEnd = addDays(today, lookaheadDays);
    return { today, lookaheadEnd };
  }, [lookaheadDays]);

  // Estrutura de Exibição (com ou sem Agrupamento por Fases e Lookahead)
  const displayRows = useMemo(() => {
    let list = tasksWithPositions;

    // Filtro Lookahead
    if (lookaheadFilterActive) {
      list = list.filter((t) => {
        if (!t.startDate || !t.endDate) return false;
        const start = startOfDay(t.startDate instanceof Date ? t.startDate : (t.startDate as any).toDate());
        const end = startOfDay(t.endDate instanceof Date ? t.endDate : (t.endDate as any).toDate());
        return (
          (start >= lookaheadWindow.today && start <= lookaheadWindow.lookaheadEnd) ||
          (end >= lookaheadWindow.today && end <= lookaheadWindow.lookaheadEnd) ||
          (start <= lookaheadWindow.today && end >= lookaheadWindow.today)
        );
      });
    }

    // Filtros de busca e status
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          (t.code && t.code.toLowerCase().includes(term)) ||
          (t.deliverable && t.deliverable.toLowerCase().includes(term))
      );
    }

    if (statusFilter === 'critical') {
      list = list.filter((t) => t.isCritical);
    } else if (statusFilter === 'milestones') {
      list = list.filter((t) => t.isMilestone);
    } else if (statusFilter === 'delayed') {
      list = list.filter(
        (t) =>
          t.status === 'delayed' ||
          ((t.progress || 0) < 100 && t.endDate && new Date(t.endDate) < new Date())
      );
    } else if (statusFilter === 'in_progress') {
      list = list.filter((t) => (t.progress || 0) > 0 && (t.progress || 0) < 100);
    } else if (statusFilter === 'completed') {
      list = list.filter((t) => (t.progress || 0) === 100 || t.status === 'completed');
    }

    // Se NÃO agrupar por fases, retorna linhas normais
    if (!groupByPhase) {
      return list.map((t, idx) => ({
        type: 'task' as const,
        data: t,
        visualRowIndex: idx,
      }));
    }

    // SE AGRUPAR POR FASES (Summary Rows + Tasks)
    const phaseMap = new Map<string, typeof list>();
    list.forEach((t) => {
      const cat = t.category || 'Geral';
      if (!phaseMap.has(cat)) phaseMap.set(cat, []);
      phaseMap.get(cat)!.push(t);
    });

    const rows: {
      type: 'phase' | 'task';
      data?: typeof list[0];
      phaseName?: string;
      phaseStart?: Date;
      phaseEnd?: Date;
      phaseDuration?: number;
      phaseOffset?: number;
      phaseProgress?: number;
      taskCount?: number;
      visualRowIndex: number;
    }[] = [];

    let rowIndex = 0;

    phaseMap.forEach((phaseTasks, phaseName) => {
      const isCollapsed = !!collapsedPhases[phaseName];

      const minStart = phaseTasks.reduce(
        (earliest, t) => (t.startDate && t.startDate < earliest ? t.startDate : earliest),
        phaseTasks[0].startDate!
      );
      const maxEnd = phaseTasks.reduce(
        (latest, t) => (t.endDate && t.endDate > latest ? t.endDate : latest),
        phaseTasks[0].endDate!
      );

      const phaseDuration = Math.max(1, differenceInDays(maxEnd, minStart) + 1);
      const phaseOffset = Math.max(0, differenceInDays(minStart, ganttStart));

      const totalWeight = phaseTasks.reduce((acc, t) => acc + (t.weight || 5), 0) || 1;
      const weightedProgress = Math.round(
        phaseTasks.reduce((acc, t) => acc + (t.progress || 0) * (t.weight || 5), 0) / totalWeight
      );

      rows.push({
        type: 'phase',
        phaseName,
        phaseStart: minStart,
        phaseEnd: maxEnd,
        phaseDuration,
        phaseOffset,
        phaseProgress: weightedProgress,
        taskCount: phaseTasks.length,
        visualRowIndex: rowIndex++,
      });

      if (!isCollapsed) {
        phaseTasks.forEach((t) => {
          rows.push({
            type: 'task',
            data: t,
            visualRowIndex: rowIndex++,
          });
        });
      }
    });

    return rows;
  }, [tasksWithPositions, searchTerm, statusFilter, groupByPhase, collapsedPhases, ganttStart, lookaheadFilterActive, lookaheadWindow]);

  // Linhas de Dependência SVG com Lag e Relações
  const dependencyLines = useMemo(() => {
    const lines: { key: string; path: string; isCritical: boolean; lagLabel?: string; labelX: number; labelY: number }[] = [];
    const taskRowMap = new Map<string, number>();

    displayRows.forEach((row) => {
      if (row.type === 'task' && row.data) {
        taskRowMap.set(row.data.id, row.visualRowIndex);
      }
    });

    const taskMap = new Map(tasksWithPositions.map((t) => [t.id, t]));

    displayRows.forEach((row) => {
      if (row.type === 'task' && row.data && row.data.dependencies && row.data.dependencies.length > 0) {
        const task = row.data;
        const toRowIndex = row.visualRowIndex;

        task.dependencies?.forEach((depId) => {
          const predecessor = taskMap.get(depId);
          const fromRowIndex = taskRowMap.get(depId);

          if (!predecessor || fromRowIndex === undefined) return;

          const fromX = (predecessor.gantt.offset + predecessor.gantt.duration) * DAY_WIDTH;
          const fromY = fromRowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
          const toX = task.gantt.offset * DAY_WIDTH;
          const toY = toRowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

          const isCriticalLine = predecessor.isCritical && task.isCritical && showCriticalPath;

          const halfWay = fromX + 12;
          const path = `M ${fromX} ${fromY} H ${halfWay} V ${toY} H ${toX}`;

          const lagDays = (task as any).dependencyLagDays;
          const depType = (task as any).dependencyType;
          const lagLabel = lagDays ? `+${lagDays}d` : depType && depType !== 'FS' ? depType : undefined;

          lines.push({
            key: `${depId}-${task.id}`,
            path,
            isCritical: isCriticalLine,
            lagLabel,
            labelX: halfWay,
            labelY: (fromY + toY) / 2,
          });
        });
      }
    });
    return lines;
  }, [displayRows, tasksWithPositions, DAY_WIDTH, showCriticalPath]);

  // Posição de "Hoje" no grid
  const todayPosition = useMemo(() => {
    const now = new Date();
    if (isBefore(now, ganttStart) || isAfter(now, ganttEnd)) {
      return null;
    }
    const daysFromStart = differenceInDays(now, ganttStart);
    return daysFromStart * DAY_WIDTH + DAY_WIDTH / 2;
  }, [ganttStart, ganttEnd, DAY_WIDTH]);

  // Linha de Progresso Dente de Serra (Jagged Progress Line / Status Line)
  const progressLinePoints = useMemo(() => {
    if (!showProgressLine || todayPosition === null || displayRows.length === 0) return null;

    const points: { x: number; y: number; isDelayed: boolean; isAhead: boolean }[] = [];
    const now = new Date();

    displayRows.forEach((row) => {
      const y = row.visualRowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      let x = todayPosition;
      let isDelayed = false;
      let isAhead = false;

      if (row.type === 'task' && row.data) {
        const task = row.data;
        const progress = task.progress || 0;
        const taskStart = task.startDate instanceof Date ? task.startDate : (task.startDate as any)?.toDate ? (task.startDate as any).toDate() : new Date(task.startDate || 0);

        if (progress === 100) {
          x = (task.gantt.offset + task.gantt.duration) * DAY_WIDTH;
        } else if (progress > 0) {
          x = (task.gantt.offset + (task.gantt.duration * progress) / 100) * DAY_WIDTH;
        } else {
          if (isBefore(taskStart, now)) {
            x = task.gantt.offset * DAY_WIDTH;
          } else {
            x = todayPosition;
          }
        }

        if (x < todayPosition - 2) isDelayed = true;
        if (x > todayPosition + 2) isAhead = true;
      } else if (row.type === 'phase') {
        const progress = row.phaseProgress || 0;
        if (progress > 0) {
          x = ((row.phaseOffset || 0) + ((row.phaseDuration || 1) * progress) / 100) * DAY_WIDTH;
        } else {
          x = todayPosition;
        }
        if (x < todayPosition - 2) isDelayed = true;
        if (x > todayPosition + 2) isAhead = true;
      }

      points.push({ x, y, isDelayed, isAhead });
    });

    return points;
  }, [showProgressLine, todayPosition, displayRows, DAY_WIDTH]);

  const progressPolylineString = useMemo(() => {
    if (!progressLinePoints || progressLinePoints.length === 0 || todayPosition === null) return '';
    const startPoint = `${todayPosition},0`;
    const intermediate = progressLinePoints.map((p) => `${p.x},${p.y}`).join(' ');
    const endPoint = `${todayPosition},${displayRows.length * ROW_HEIGHT}`;
    return `${startPoint} ${intermediate} ${endPoint}`;
  }, [progressLinePoints, todayPosition, displayRows.length]);

  // Contagem de Conflitos de Recursos
  const resourceConflictCount = useMemo(() => {
    if (tasks.length < 2) return 0;
    let count = 0;
    const taskResources = tasks.map((t) => {
      const start = t.startDate instanceof Date ? t.startDate : (t.startDate as any)?.toDate ? (t.startDate as any).toDate() : new Date(t.startDate || 0);
      const end = t.endDate instanceof Date ? t.endDate : (t.endDate as any)?.toDate ? (t.endDate as any).toDate() : new Date(t.endDate || 0);
      const equipments = (t as any).assignedEquipment || [];
      const people = [...((t as any).assignedWorkforce || [])];
      if ((t as any).assignedToName) people.push((t as any).assignedToName);
      return { start, end, equipments, people };
    });

    for (let i = 0; i < taskResources.length; i++) {
      for (let j = i + 1; j < taskResources.length; j++) {
        const a = taskResources[i];
        const b = taskResources[j];
        if (a.start <= b.end && a.end >= b.start) {
          const hasEqConflict = a.equipments.some((eq: string) => b.equipments.includes(eq));
          const hasPersonConflict = a.people.some((p: string) => b.people.includes(p));
          if (hasEqConflict || hasPersonConflict) count++;
        }
      }
    }
    return count;
  }, [tasks]);

  // Alternar Modo Reunião (Fullscreen)
  const toggleFullscreen = () => {
    if (!chartWrapperRef.current) return;
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Fullscreen error:', err);
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Exit fullscreen error:', err);
        setIsFullscreen(false);
      });
    }
  };

  // Exportar Cronograma em MS Project XML
  const handleExportMsProjectXml = () => {
    if (tasks.length === 0) return;
    const xml = exportToMsProjectXml(tasks, `Projeto-${projectId}`);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cronograma_msproject_${projectId}_${format(new Date(), 'yyyyMMdd')}.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'Exportação MS Project Concluída',
      description: 'Arquivo XML compatível com Microsoft Project gerado com sucesso.',
    });
  };

  // Centralizar no dia de Hoje
  const handleScrollToToday = () => {
    if (todayPosition !== null && timelineContainerRef.current) {
      const scrollTarget = todayPosition - 200;
      timelineContainerRef.current.scrollTo({
        left: Math.max(0, scrollTarget),
        behavior: 'smooth',
      });
    }
  };

  // Toggle de colapso de fase
  const togglePhaseCollapse = (phaseName: string) => {
    setCollapsedPhases((prev) => ({
      ...prev,
      [phaseName]: !prev[phaseName],
    }));
  };

  // Aplicar Cenário What-If ao Cronograma Oficial
  const handleApplyWhatIfScenario = async () => {
    const shiftEntries = Object.entries(simulatedShifts).filter(([_, d]) => d !== 0);
    if (shiftEntries.length === 0 || !projectId) return;

    try {
      const batch = writeBatch(db);
      shiftEntries.forEach(([taskId, delta]) => {
        const t = tasks.find((item) => item.id === taskId);
        if (t && t.startDate && t.endDate) {
          const start = t.startDate instanceof Date ? t.startDate : (t.startDate as any).toDate();
          const end = t.endDate instanceof Date ? t.endDate : (t.endDate as any).toDate();
          const newStart = addDays(start, delta);
          const newEnd = addDays(end, delta);
          const taskRef = doc(db, 'projects', projectId, 'wbs', taskId);
          batch.update(taskRef, {
            startDate: Timestamp.fromDate(newStart),
            endDate: Timestamp.fromDate(newEnd),
          });
        }
      });

      await batch.commit();

      toast({
        title: 'Cenário Gravado!',
        description: `${shiftEntries.length} atividades foram reprogramadas com sucesso.`,
      });

      setSimulatedShifts({});
      setIsWhatIfOpen(false);
    } catch (err: any) {
      console.error('Erro ao aplicar cenário:', err);
      toast({
        title: 'Erro ao Gravar',
        description: 'Falha ao aplicar o cenário no banco de dados.',
        variant: 'destructive',
      });
    }
  };

  // --- DRAG & RESIZE DE BARRAS DE GANTT ---
  const handleMouseDownOnBar = (
    e: React.MouseEvent,
    task: WbsItem,
    type: 'move' | 'resize-start' | 'resize-end'
  ) => {
    if (!canEdit || task.isMilestone) return;
    e.stopPropagation();

    const start = task.startDate instanceof Date ? task.startDate : (task.startDate as any).toDate();
    const end = task.endDate instanceof Date ? task.endDate : (task.endDate as any).toDate();

    setDragging({
      taskId: task.id,
      type,
      startX: e.clientX,
      initialStart: start,
      initialEnd: end,
      deltaDays: 0,
    });
  };

  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      const diffPx = e.clientX - dragging.startX;
      const deltaDays = Math.round(diffPx / DAY_WIDTH);
      if (deltaDays !== dragging.deltaDays) {
        setDragging((prev) => (prev ? { ...prev, deltaDays } : null));
      }
    },
    [dragging, DAY_WIDTH]
  );

  const handleGlobalMouseUp = useCallback(async () => {
    if (!dragging) return;

    const { taskId, type, initialStart, initialEnd, deltaDays } = dragging;
    setDragging(null);

    if (deltaDays === 0) return;

    let newStart = initialStart;
    let newEnd = initialEnd;

    if (type === 'move') {
      newStart = addDays(initialStart, deltaDays);
      newEnd = addDays(initialEnd, deltaDays);
    } else if (type === 'resize-end') {
      newEnd = addDays(initialEnd, deltaDays);
      if (isBefore(newEnd, newStart)) {
        newEnd = newStart;
      }
    } else if (type === 'resize-start') {
      newStart = addDays(initialStart, deltaDays);
      if (isAfter(newStart, newEnd)) {
        newStart = newEnd;
      }
    }

    const durationDays = differenceInDays(newEnd, newStart) + 1;

    try {
      const taskRef = doc(db, 'projects', projectId, 'wbs', taskId);
      await updateDoc(taskRef, {
        startDate: Timestamp.fromDate(newStart),
        endDate: Timestamp.fromDate(newEnd),
        durationDays,
      });

      toast({
        title: 'Atividade Reprogramada',
        description: `Datas ajustadas via arrasto: ${format(newStart, 'dd/MM/yy')} → ${format(newEnd, 'dd/MM/yy')} (${durationDays} dias).`,
      });
    } catch (err: any) {
      console.error('Erro ao atualizar atividade via arrasto:', err);
      toast({
        title: 'Erro ao Salvar',
        description: 'Falha ao salvar as novas datas.',
        variant: 'destructive',
      });
    }
  }, [dragging, projectId, toast]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragging, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Exportar Cronograma em CSV
  const handleExportCsv = () => {
    if (tasksWithPositions.length === 0) return;

    const headers = [
      'Código EAP',
      'Nome da Atividade',
      'Categoria / Fase',
      'Início Previsto',
      'Fim Previsto',
      'Duração (Dias)',
      'Progresso (%)',
      'Estado',
      'Caminho Crítico',
      'Folga Total (Dias)',
      'Linha de Base Início',
      'Linha de Base Fim',
      'Desvio (Dias)',
      'Marco Contratual',
      'Predecessoras',
      'Defasagem (Lag)',
    ];

    const rows = tasksWithPositions.map((t) => [
      `"${t.code || ''}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.category || ''}"`,
      t.startDate ? format(t.startDate, 'yyyy-MM-dd') : '',
      t.endDate ? format(t.endDate, 'yyyy-MM-dd') : '',
      t.gantt.duration,
      t.progress || 0,
      `"${t.status || 'not_started'}"`,
      t.isCritical ? 'SIM' : 'NÃO',
      t.totalSlack,
      t.baselineStartDate ? format(t.baselineStartDate, 'yyyy-MM-dd') : '',
      t.baselineEndDate ? format(t.baselineEndDate, 'yyyy-MM-dd') : '',
      t.varianceDays,
      t.isMilestone ? 'SIM' : 'NÃO',
      `"${(t.dependencies || []).join(', ')}"`,
      (t as any).dependencyLagDays ? `${(t as any).dependencyLagDays}d` : '0d',
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cronograma_${projectId}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs de Topo
  const criticalCount = useMemo(() => tasksWithPositions.filter((t) => t.isCritical).length, [tasksWithPositions]);
  const delayedCount = useMemo(
    () =>
      tasksWithPositions.filter(
        (t) =>
          t.status === 'delayed' ||
          ((t.progress || 0) < 100 && t.endDate && new Date(t.endDate) < new Date())
      ).length,
    [tasksWithPositions]
  );
  const milestoneCount = useMemo(() => tasksWithPositions.filter((t) => t.isMilestone).length, [tasksWithPositions]);
  const milestoneDone = useMemo(
    () => tasksWithPositions.filter((t) => t.isMilestone && (t.progress || 0) === 100).length,
    [tasksWithPositions]
  );
  const avgSlack = useMemo(() => {
    if (tasksWithPositions.length === 0) return 0;
    const sum = tasksWithPositions.reduce((acc, t) => acc + t.totalSlack, 0);
    return Math.round(sum / tasksWithPositions.length);
  }, [tasksWithPositions]);

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Cronograma do Projeto (Gráfico de Gantt)</CardTitle>
            <CardDescription>Carregando a rede de atividades, CPM e linha de base...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-72">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cronograma do Projeto (Gráfico de Gantt)</CardTitle>
                <CardDescription>Visualize a linha do tempo, caminho crítico (CPM) e linha de base.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsNewTaskDialogOpen(true)} className="font-bold">
                <Plus className="h-4 w-4 mr-1.5" />
                Nova Atividade
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-12 text-center text-muted-foreground border rounded-lg bg-card">
              <GanttChartIcon className="h-12 w-12 mx-auto mb-4 text-primary opacity-80" />
              <h3 className="text-lg font-bold text-foreground">Nenhuma Atividade com Datas Cadastrada</h3>
              <p className="text-sm mt-1 max-w-prose mx-auto text-muted-foreground mb-4">
                Adicione atividades com data de início e fim para gerar a rede de Gantt e o Caminho Crítico.
              </p>
              <Button size="sm" onClick={() => setIsNewTaskDialogOpen(true)} className="font-bold">
                <Plus className="h-4 w-4 mr-1.5" />
                Criar Primeira Atividade
              </Button>
            </div>
          </CardContent>
        </Card>

        <GanttNewTaskDialog
          open={isNewTaskDialogOpen}
          onOpenChange={setIsNewTaskDialogOpen}
          projectId={projectId}
          existingTasks={tasks}
        />
      </div>
    );
  }

  return (
    <div ref={chartWrapperRef} className={cn("p-2 sm:p-4 space-y-4 select-none", isFullscreen && "fixed inset-0 z-50 bg-background overflow-y-auto p-4")}>
      {/* SELO INSTITUCIONAL DE ENGENHARIA VISÍVEL APENAS NA IMPRESSÃO (@media print) */}
      <div className="print-only mb-4 border-2 border-slate-900 p-4 rounded-xs bg-white text-black">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2">
          <div>
            <div className="text-sm font-black tracking-widest uppercase text-slate-950">PROFUNDIDADE OS</div>
            <div className="text-[9px] font-bold text-slate-600 uppercase">SISTEMA OPERACIONAL DE ENGENHARIA & OPERAÇÕES</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-black uppercase bg-slate-900 text-white px-2.5 py-0.5 rounded-xs inline-block">
              CRONOGRAMA GERAL & REDE CPM
            </div>
            <div className="text-[8px] text-slate-600 font-mono mt-0.5">PADRÃO FIDIC / ORDEM DOS ENGENHEIROS DE ANGOLA</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-[10px] bg-slate-50 p-2.5 border border-slate-300">
          <div>
            <span className="font-bold text-slate-700">EMPREITADA:</span>
            <div className="font-semibold truncate text-slate-900">{projectInfo.name}</div>
          </div>
          <div>
            <span className="font-bold text-slate-700">DONO DA OBRA:</span>
            <div className="font-semibold truncate text-slate-900">{projectInfo.clientName}</div>
          </div>
          <div>
            <span className="font-bold text-slate-700">CÓDIGO DA OBRA:</span>
            <div className="font-semibold truncate font-mono text-slate-900">{projectInfo.code}</div>
          </div>
          <div>
            <span className="font-bold text-slate-700">DATA DE CORTE / STATUS:</span>
            <div className="font-semibold font-mono text-slate-900">{format(new Date(), 'dd/MM/yyyy')} (HOJE)</div>
          </div>
        </div>
      </div>

      {/* 1. COCKPIT DE KPIS EXECUTIVOS DO CRONOGRAMA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <Card className="p-3 bg-card border shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            Duração Total
          </div>
          <div className="text-lg font-bold text-foreground mt-0.5">
            {totalProjectDuration} <span className="text-xs font-normal text-muted-foreground">dias</span>
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {earliestProjectStart && format(earliestProjectStart, 'dd/MM/yy')} →{' '}
            {latestProjectEnd && format(latestProjectEnd, 'dd/MM/yy')}
          </div>
        </Card>

        <Card className="p-3 bg-card border shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-rose-500" />
            Caminho Crítico
          </div>
          <div className="text-lg font-bold text-rose-600 mt-0.5">
            {criticalCount}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              ({tasksWithPositions.length > 0 ? Math.round((criticalCount / tasksWithPositions.length) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">Zero folga contratual</div>
        </Card>

        <Card className="p-3 bg-card border shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Tarefas Atrasadas
          </div>
          <div className={cn("text-lg font-bold mt-0.5", delayedCount > 0 ? "text-amber-600" : "text-emerald-600")}>
            {delayedCount}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {delayedCount > 0 ? 'Exigem ação preventiva' : 'Em conformidade'}
          </div>
        </Card>

        <Card className="p-3 bg-card border shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <Diamond className="h-3.5 w-3.5 text-amber-500" />
            Marcos Concluídos
          </div>
          <div className="text-lg font-bold text-foreground mt-0.5">
            {milestoneDone} / {milestoneCount}
          </div>
          <div className="text-[10px] text-muted-foreground">Pontos de controle contratuais</div>
        </Card>

        <Card className="p-3 bg-card border shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <GitBranch className="h-3.5 w-3.5 text-blue-500" />
            Folga Média
          </div>
          <div className="text-lg font-bold text-foreground mt-0.5">
            {avgSlack} <span className="text-xs font-normal text-muted-foreground">dias</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Reserva de contingência</div>
        </Card>

        <Card className="p-3 bg-card border shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <Bookmark className="h-3.5 w-3.5 text-primary" />
            Linha de Base
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBaselineModalOpen(true)}
            disabled={!canEdit}
            className="h-7 text-xs font-semibold px-2 mt-1 w-full"
          >
            Gravar Snapshot
          </Button>
          <div className="text-[10px] text-muted-foreground mt-1 truncate">Referencial do contrato</div>
        </Card>
      </div>

      {/* 2. BARRA DE FERRAMENTAS AVANÇADA */}
      <Card className="border shadow-xs">
        <div className="p-3 flex flex-wrap items-center justify-between gap-2.5 border-b bg-muted/20 no-print">
          {/* Lado Esquerdo: Ações Primárias e Pesquisa */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setIsNewTaskDialogOpen(true)}
                className="h-8 text-xs font-bold px-3 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nova Atividade
              </Button>
            )}

            {/* Lookahead LPS */}
            <Button
              size="sm"
              variant={isLookaheadOpen ? "default" : "outline"}
              onClick={() => setIsLookaheadOpen(!isLookaheadOpen)}
              className={cn("h-8 text-xs font-semibold px-2.5", isLookaheadOpen && "bg-blue-600 hover:bg-blue-700 text-white")}
              title="Abrir painel de Lookahead Operacional (14d/28d)"
            >
              <CalendarRange className="h-3.5 w-3.5 mr-1" />
              Lookahead
            </Button>

            {/* Simulador What-If */}
            <Button
              size="sm"
              variant={isWhatIfOpen ? "default" : "outline"}
              onClick={() => setIsWhatIfOpen(!isWhatIfOpen)}
              className={cn("h-8 text-xs font-semibold px-2.5", isWhatIfOpen && "bg-purple-600 hover:bg-purple-700 text-white")}
              title="Abrir simulador de cenários e sensibilidade de prazos"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              What-If
            </Button>

            {/* Conflitos de Recursos */}
            <Button
              size="sm"
              variant={isConflictsOpen ? "default" : "outline"}
              onClick={() => setIsConflictsOpen(!isConflictsOpen)}
              className={cn("h-8 text-xs font-semibold px-2.5 relative", isConflictsOpen && "bg-amber-600 hover:bg-amber-700 text-white")}
              title="Detector de conflitos e sobrealocação de recursos (equipamentos e equipes)"
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              Conflitos
              {resourceConflictCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {resourceConflictCount}
                </span>
              )}
            </Button>

            {/* Importar Cronograma */}
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsImportModalOpen(true)}
                className="h-8 text-xs font-semibold px-2.5 bg-background border hover:bg-muted"
                title="Importar cronograma de MS Project (.xml) ou CSV"
              >
                <Upload className="h-3.5 w-3.5 mr-1 text-primary" />
                <span className="hidden sm:inline">Importar</span>
              </Button>
            )}

            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCascadeModalOpen(true)}
                className="h-8 text-xs font-semibold px-2.5 bg-background border hover:bg-muted"
                title="Ajusta automaticamente sucessoras que violam precedência"
              >
                <GitMerge className="h-3.5 w-3.5 mr-1 text-primary" />
                Cascata CPM
              </Button>
            )}

            <div className="relative w-36 sm:w-48">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              <Input
                placeholder="Buscar atividade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs h-8 pl-8"
              />
            </div>

            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-8 text-xs w-28 sm:w-32">
                <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Tarefas</SelectItem>
                <SelectItem value="critical">Caminho Crítico</SelectItem>
                <SelectItem value="delayed">Atrasadas</SelectItem>
                <SelectItem value="in_progress">Em Execução</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="milestones">Apenas Marcos</SelectItem>
              </SelectContent>
            </Select>

            {todayPosition !== null && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleScrollToToday}
                className="h-8 text-xs font-semibold px-2 bg-background border hover:bg-muted"
              >
                <Calendar className="h-3.5 w-3.5 mr-1 text-rose-500" />
                Hoje
              </Button>
            )}
          </div>

          {/* Lado Direito: Toggles, Agrupamento, Curva S, Zoom e Exportação */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Agrupar por Fases */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-card text-xs">
              <FolderKanban className={cn("h-3.5 w-3.5", groupByPhase ? "text-primary font-bold" : "text-muted-foreground")} />
              <span className="font-semibold text-[11px] hidden sm:inline">Fases EAP</span>
              <Switch checked={groupByPhase} onCheckedChange={setGroupByPhase} />
            </div>

            {/* Toggle Curva S / Histograma */}
            <Button
              size="sm"
              variant={isSCurveOpen ? "default" : "outline"}
              onClick={() => setIsSCurveOpen(!isSCurveOpen)}
              className={cn("h-8 text-xs font-semibold px-2.5", isSCurveOpen && "bg-primary text-primary-foreground")}
              title="Abrir painel de Curva S acumulada e histograma diário"
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Curva S</span>
            </Button>

            {/* Toggle Linha de Status Dente-de-Serra */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-card text-xs" title="Linha de progresso dente-de-serra em relação à data de hoje">
              <Activity className={cn("h-3.5 w-3.5", showProgressLine ? "text-amber-500" : "text-muted-foreground")} />
              <span className="font-semibold text-[11px] hidden md:inline">Status</span>
              <Switch checked={showProgressLine} onCheckedChange={setShowProgressLine} />
            </div>

            {/* Toggle Caminho Crítico */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-card text-xs">
              <Flame className={cn("h-3.5 w-3.5", showCriticalPath ? "text-rose-500" : "text-muted-foreground")} />
              <span className="font-semibold text-[11px] hidden md:inline">CPM</span>
              <Switch checked={showCriticalPath} onCheckedChange={setShowCriticalPath} />
            </div>

            {/* Toggle Linha de Base */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-card text-xs">
              <Bookmark className={cn("h-3.5 w-3.5", showBaseline ? "text-primary" : "text-muted-foreground")} />
              <span className="font-semibold text-[11px] hidden md:inline">Base</span>
              <Switch checked={showBaseline} onCheckedChange={setShowBaseline} />
            </div>

            {/* Zoom Selector */}
            <div className="flex items-center rounded-md border bg-card p-0.5">
              <button
                onClick={() => setZoom('days')}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded transition-colors",
                  zoom === 'days' ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Dia
              </button>
              <button
                onClick={() => setZoom('weeks')}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded transition-colors",
                  zoom === 'weeks' ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Semana
              </button>
              <button
                onClick={() => setZoom('months')}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded transition-colors",
                  zoom === 'months' ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Mês
              </button>
            </div>

            {/* Exportar MS Project XML */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportMsProjectXml}
              className="h-8 text-xs font-medium px-2.5"
              title="Exportar no formato nativo Microsoft Project XML (.xml)"
            >
              <FileCode className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              <span className="hidden sm:inline">MS Project</span>
            </Button>

            {/* Exportar CSV */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              className="h-8 text-xs font-medium px-2.5"
              title="Exportar dados do cronograma em CSV/Excel"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">CSV</span>
            </Button>

            {/* Modo Reunião / Tela Cheia */}
            <Button
              size="sm"
              variant={isFullscreen ? "secondary" : "outline"}
              onClick={toggleFullscreen}
              className="h-8 text-xs font-medium px-2.5"
              title={isFullscreen ? "Sair da tela cheia" : "Modo Reunião de Obra (Tela Cheia)"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Restaurar</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 mr-1 text-primary" />
                  <span className="hidden sm:inline">Reunião</span>
                </>
              )}
            </Button>

            {/* Imprimir / Dossiê PDF */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPrintModalOpen(true)}
              className="h-8 text-xs font-semibold px-2.5 bg-background border hover:bg-muted text-primary"
              title="Impressão Ultra Profissional (Dossiê PDF, A3/A4, Selo FIDIC/OEA)"
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </Button>
          </div>
        </div>

        {/* PAINEL DO LOOKAHEAD OPERACIONAL (SE ABERTO) */}
        {isLookaheadOpen && (
          <div className="p-3 border-b bg-blue-500/5">
            <GanttLookaheadPanel
              tasks={tasks}
              isOpen={isLookaheadOpen}
              onClose={() => setIsLookaheadOpen(false)}
              lookaheadDays={lookaheadDays}
              onLookaheadDaysChange={setLookaheadDays}
              onSelectTask={(t) => {
                setSelectedTask(t);
                setIsTaskDialogOpen(true);
              }}
            />
          </div>
        )}

        {/* PAINEL DE SIMULAÇÃO WHAT-IF (SE ABERTO) */}
        {isWhatIfOpen && (
          <div className="p-3 border-b bg-purple-500/5">
            <GanttWhatIfSimulator
              tasks={tasks}
              isOpen={isWhatIfOpen}
              onClose={() => setIsWhatIfOpen(false)}
              simulatedShifts={simulatedShifts}
              onSimulatedShiftsChange={setSimulatedShifts}
              onApplyScenario={handleApplyWhatIfScenario}
            />
          </div>
        )}

        {/* PAINEL DE CONFLITOS DE RECURSOS (SE ABERTO) */}
        {isConflictsOpen && (
          <div className="p-3 border-b bg-amber-500/5">
            <GanttResourceConflictsPanel
              tasks={tasks}
              isOpen={isConflictsOpen}
              onClose={() => setIsConflictsOpen(false)}
              onSelectTask={(t) => {
                setSelectedTask(t);
                setIsTaskDialogOpen(true);
              }}
            />
          </div>
        )}

        {/* 3. GRID DO CRONOGRAMA & GANTT */}
        <CardContent className="p-0">
          <TooltipProvider>
            <div className="overflow-x-auto bg-background" ref={timelineContainerRef}>
              <div
                className="grid min-w-max"
                style={{
                  gridTemplateColumns: '360px 1fr',
                }}
              >
                {/* COLUNA ESQUERDA: LISTA DE ATIVIDADES E EAP */}
                <div className="sticky left-0 bg-background z-20 border-r shadow-xs">
                  {/* Cabeçalho Fixo Esquerdo */}
                  <div className="h-[74px] border-b bg-card flex flex-col justify-end p-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <GanttChartIcon className="h-4 w-4 text-primary" />
                        Estrutura da Obra / Atividade
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {displayRows.length} linha(s)
                      </span>
                    </div>
                  </div>

                  {/* Linhas de Atividades à Esquerda */}
                  <div>
                    {displayRows.map((row) => {
                      if (row.type === 'phase') {
                        const isCollapsed = !!collapsedPhases[row.phaseName!];
                        return (
                          <div
                            key={`phase-${row.phaseName}`}
                            onClick={() => togglePhaseCollapse(row.phaseName!)}
                            className="px-3 border-b flex items-center justify-between cursor-pointer bg-muted/60 hover:bg-muted font-bold text-xs text-foreground transition-colors"
                            style={{ height: ROW_HEIGHT }}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-primary shrink-0" />
                              )}
                              <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate">{row.phaseName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 font-mono">
                                {row.phaseProgress}%
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-mono w-7 text-right">
                                {row.phaseDuration}d
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Linha de Tarefa Normal
                      const task = row.data!;
                      const isDelayed =
                        task.status === 'delayed' ||
                        ((task.progress || 0) < 100 && task.endDate && new Date(task.endDate) < new Date());

                      const hasSimulatedShift = !!simulatedShifts[task.id];

                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (canEdit && !dragging) {
                              setSelectedTask(task);
                              setIsTaskDialogOpen(true);
                            }
                          }}
                          className={cn(
                            "px-3 border-b flex items-center justify-between cursor-pointer transition-colors group text-xs",
                            groupByPhase && "pl-7 bg-card/40",
                            task.isCritical && showCriticalPath && "bg-rose-500/5",
                            hasSimulatedShift && "bg-purple-500/10",
                            "hover:bg-accent/40"
                          )}
                          style={{ height: ROW_HEIGHT }}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            {task.isMilestone ? (
                              <Diamond className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            ) : task.isCritical && showCriticalPath ? (
                              <Flame className="h-3.5 w-3.5 text-rose-500 shrink-0 animate-pulse" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                            )}

                            {task.code && (
                              <span className="font-mono text-[11px] font-bold text-muted-foreground shrink-0">
                                {task.code}
                              </span>
                            )}

                            <span className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                              {task.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasSimulatedShift && (
                              <Badge className="text-[9px] h-4 px-1 py-0 font-bold bg-purple-600">
                                {simulatedShifts[task.id] > 0 ? `+${simulatedShifts[task.id]}d` : `${simulatedShifts[task.id]}d`}
                              </Badge>
                            )}

                            {task.isCritical && showCriticalPath && (
                              <Badge variant="destructive" className="text-[9px] h-4 px-1 py-0 font-bold uppercase">
                                CPM
                              </Badge>
                            )}

                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] h-4 px-1.5 py-0 font-mono",
                                (task.progress || 0) === 100
                                  ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                                  : isDelayed
                                  ? "border-rose-500 text-rose-600 bg-rose-500/10"
                                  : "border-blue-500 text-blue-600 bg-blue-500/10"
                              )}
                            >
                              {task.progress || 0}%
                            </Badge>

                            <span className="text-[10px] text-muted-foreground font-mono w-7 text-right">
                              {task.gantt.duration}d
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* COLUNA DIREITA: GRID TEMPORAL GANTT */}
                <div className="relative">
                  {/* Cabeçalho Fixo do Calendário com Feriados de Angola */}
                  <div className="sticky top-0 bg-card z-10 border-b shadow-2xs">
                    {/* Linha dos Meses */}
                    <div className="flex border-b h-8">
                      {monthHeaders.map((month, index) => (
                        <div
                          key={index}
                          style={{ width: month.days * DAY_WIDTH }}
                          className="text-center font-bold px-1 border-r text-xs capitalize flex items-center justify-center bg-muted/30 text-foreground truncate"
                        >
                          {month.name}
                        </div>
                      ))}
                    </div>

                    {/* Linha dos Dias / Semanas */}
                    <div className="flex h-[42px]">
                      {dateRange.map((day, index) => {
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const isCurrentDay = isToday(day);
                        const angolaHoliday = getAngolaHoliday(day);

                        return (
                          <Tooltip key={index} delayDuration={100}>
                            <TooltipTrigger asChild>
                              <div
                                style={{ width: DAY_WIDTH }}
                                className={cn(
                                  "text-center text-[11px] border-r h-full flex flex-col items-center justify-center font-mono select-none relative",
                                  isWeekend && "bg-muted/40 text-muted-foreground",
                                  isCurrentDay && "bg-rose-500/15 font-bold text-rose-600",
                                  angolaHoliday && "bg-amber-500/15 font-bold text-amber-900 dark:text-amber-200"
                                )}
                              >
                                <span className="text-[9px] uppercase leading-none opacity-60">
                                  {format(day, 'EEEEEE', { locale: ptBR })}
                                </span>
                                <span className="leading-tight">{format(day, 'd')}</span>
                                {angolaHoliday && (
                                  <span className="h-1 w-1 rounded-full bg-amber-500 absolute bottom-1" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="p-2 text-xs max-w-xs">
                              <p className="font-bold">{format(day, 'PPP', { locale: ptBR })}</p>
                              {angolaHoliday && (
                                <p className="text-amber-600 dark:text-amber-400 font-semibold pt-1 border-t mt-1">
                                  🇦🇴 Feriado Nacional: {angolaHoliday.name}
                                  <br />
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    {angolaHoliday.description}
                                  </span>
                                </p>
                              )}
                              {isCurrentDay && (
                                <p className="text-rose-600 font-bold text-[10px] pt-0.5">Dia Atual (Hoje)</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>

                  {/* Corpo do Gráfico de Barras */}
                  <div
                    className="relative"
                    style={{ height: displayRows.length * ROW_HEIGHT }}
                  >
                    {/* Linhas Horizontais de Fundo */}
                    {displayRows.map((_, index) => (
                      <div
                        key={index}
                        className="absolute w-full border-b"
                        style={{ top: (index + 1) * ROW_HEIGHT }}
                      />
                    ))}

                    {/* Linhas Verticais de Dias de Fundo com Feriados */}
                    {dateRange.map((day, index) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isCurrentDay = isToday(day);
                      const angolaHoliday = isAngolaHoliday(day);

                      return (
                        <div
                          key={index}
                          style={{ left: index * DAY_WIDTH, width: DAY_WIDTH }}
                          className={cn(
                            "absolute top-0 h-full border-r pointer-events-none",
                            isWeekend && "bg-muted/20",
                            isCurrentDay && "bg-rose-500/5",
                            angolaHoliday && "bg-amber-500/10"
                          )}
                        />
                      );
                    })}

                    {/* LINHA VERTICAL DO DIA DE HOJE */}
                    {todayPosition !== null && (
                      <div
                        ref={todayMarkerRef}
                        style={{ left: todayPosition }}
                        className="absolute top-0 h-full border-l-2 border-dashed border-rose-500 z-15 pointer-events-none"
                      >
                        <div className="sticky top-1 -ml-6 px-1.5 py-0.5 rounded bg-rose-600 text-[9px] font-black text-white uppercase tracking-wider shadow-md pointer-events-auto">
                          HOJE
                        </div>
                      </div>
                    )}

                    {/* BARRAS DE TAREFAS E FASES */}
                    {displayRows.map((row) => {
                      // CASO 1: BARRA DE RESUMO DE FASE (SUMMARY TASK BRACKET)
                      if (row.type === 'phase') {
                        return (
                          <div
                            key={`phase-bar-${row.phaseName}`}
                            style={{
                              position: 'absolute',
                              top: row.visualRowIndex * ROW_HEIGHT,
                              height: ROW_HEIGHT,
                              left: 0,
                              right: 0,
                            }}
                            className="flex flex-col justify-center pointer-events-none"
                          >
                            <div
                              className="relative h-4"
                              style={{
                                left: (row.phaseOffset || 0) * DAY_WIDTH,
                                width: Math.max(DAY_WIDTH, (row.phaseDuration || 1) * DAY_WIDTH),
                              }}
                            >
                              <div className="relative h-2.5 bg-slate-800 dark:bg-slate-200 rounded-xs shadow-xs overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${row.phaseProgress || 0}%` }}
                                />
                              </div>
                              <div className="absolute left-0 bottom-0 w-0 h-0 border-l-[6px] border-l-slate-800 dark:border-l-slate-200 border-b-[6px] border-b-transparent" />
                              <div className="absolute right-0 bottom-0 w-0 h-0 border-r-[6px] border-r-slate-800 dark:border-r-slate-200 border-b-[6px] border-b-transparent" />
                            </div>
                          </div>
                        );
                      }

                      // CASO 2: BARRA DE ATIVIDADE COM ARRASTAR E REDIMENSIONAR
                      const task = row.data!;
                      const isDelayed =
                        task.status === 'delayed' ||
                        ((task.progress || 0) < 100 && task.endDate && new Date(task.endDate) < new Date());

                      const isCritical = task.isCritical && showCriticalPath;
                      const isBeingDragged = dragging?.taskId === task.id;

                      let displayOffset = task.gantt.offset;
                      let displayDuration = task.gantt.duration;

                      if (isBeingDragged && dragging) {
                        if (dragging.type === 'move') {
                          displayOffset = Math.max(0, task.gantt.offset + dragging.deltaDays);
                        } else if (dragging.type === 'resize-end') {
                          displayDuration = Math.max(1, task.gantt.duration + dragging.deltaDays);
                        } else if (dragging.type === 'resize-start') {
                          const potentialOffset = task.gantt.offset + dragging.deltaDays;
                          displayOffset = Math.max(0, potentialOffset);
                          displayDuration = Math.max(1, task.gantt.duration - dragging.deltaDays);
                        }
                      }

                      const taskSimulatedShift = simulatedShifts[task.id] || 0;

                      return (
                        <Tooltip key={task.id} delayDuration={150}>
                          <TooltipTrigger asChild>
                            <div
                              style={{
                                position: 'absolute',
                                top: row.visualRowIndex * ROW_HEIGHT,
                                height: ROW_HEIGHT,
                                left: 0,
                                right: 0,
                              }}
                              className="flex flex-col justify-center pointer-events-auto"
                            >
                              {/* BARRA DE LINHA DE BASE (BASELINE) */}
                              {showBaseline && task.gantt.baselineDuration > 0 && (
                                <div
                                  className="absolute h-2.5 rounded bg-muted-foreground/30 border border-muted-foreground/40 pointer-events-none"
                                  style={{
                                    left: task.gantt.baselineOffset * DAY_WIDTH,
                                    width: Math.max(8, task.gantt.baselineDuration * DAY_WIDTH),
                                    bottom: '4px',
                                  }}
                                />
                              )}

                              {/* GHOST BAR DO SIMULADOR WHAT-IF */}
                              {taskSimulatedShift !== 0 && (
                                <div
                                  className="absolute h-6 rounded-md border-2 border-dashed border-purple-500 bg-purple-500/25 pointer-events-none z-15 flex items-center px-1.5"
                                  style={{
                                    left: Math.max(0, (task.gantt.offset + taskSimulatedShift) * DAY_WIDTH),
                                    width: Math.max(DAY_WIDTH, task.gantt.duration * DAY_WIDTH),
                                  }}
                                >
                                  <span className="text-[9px] font-mono font-black text-purple-900 dark:text-purple-200">
                                    {taskSimulatedShift > 0 ? `+${taskSimulatedShift}d` : `${taskSimulatedShift}d`}
                                  </span>
                                </div>
                              )}

                              {/* BARRA PRINCIPAL OU MARCO */}
                              {task.isMilestone ? (
                                <div
                                  onClick={() => {
                                    if (canEdit && !dragging) {
                                      setSelectedTask(task);
                                      setIsTaskDialogOpen(true);
                                    }
                                  }}
                                  className="absolute flex items-center justify-center cursor-pointer"
                                  style={{
                                    left: displayOffset * DAY_WIDTH,
                                    width: Math.max(DAY_WIDTH, 24),
                                    height: ROW_HEIGHT,
                                  }}
                                >
                                  <div
                                    className={cn(
                                      "h-5 w-5 bg-amber-500 border-2 border-amber-600 shadow-md transform rotate-45 flex items-center justify-center",
                                      isCritical && "ring-2 ring-rose-500 ring-offset-1 ring-offset-background animate-pulse"
                                    )}
                                  />
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    "relative h-6 p-[1px] group/bar select-none",
                                    canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                                  )}
                                  onMouseDown={(e) => handleMouseDownOnBar(e, task, 'move')}
                                  style={{
                                    left: displayOffset * DAY_WIDTH,
                                    width: Math.max(DAY_WIDTH, displayDuration * DAY_WIDTH),
                                  }}
                                >
                                  {/* ALÇA ESQUERDA DE REDIMENSIONAMENTO */}
                                  {canEdit && (
                                    <div
                                      onMouseDown={(e) => handleMouseDownOnBar(e, task, 'resize-start')}
                                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-primary/40 hover:bg-primary z-20 rounded-l-md transition-opacity"
                                      title="Arrastar para alterar data de início"
                                    />
                                  )}

                                  {/* CORPO DA BARRA */}
                                  <div
                                    className={cn(
                                      "relative h-full rounded-md border shadow-xs overflow-hidden transition-all",
                                      (task.progress || 0) === 100
                                        ? "bg-emerald-600/20 border-emerald-500 hover:border-emerald-600"
                                        : isDelayed
                                        ? "bg-rose-600/20 border-rose-500 hover:border-rose-600"
                                        : "bg-blue-600/20 border-blue-500 hover:border-blue-600",
                                      isCritical && "ring-2 ring-rose-500 ring-offset-1 ring-offset-background shadow-rose-500/20",
                                      isBeingDragged && "ring-2 ring-primary shadow-lg opacity-90 scale-[1.02]"
                                    )}
                                  >
                                    {/* Progresso Físico */}
                                    <div
                                      className={cn(
                                        "h-full rounded-l-md transition-all duration-200",
                                        (task.progress || 0) === 100
                                          ? "bg-emerald-600"
                                          : isDelayed
                                          ? "bg-rose-600"
                                          : "bg-blue-600"
                                      )}
                                      style={{ width: `${task.progress || 0}%` }}
                                    />

                                    {/* Rótulo Interno */}
                                    {displayDuration * DAY_WIDTH > 65 && (
                                      <div className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-foreground truncate pointer-events-none">
                                        <span className="truncate">
                                          {task.progress || 0}% • {task.name}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* ALÇA DIREITA DE REDIMENSIONAMENTO */}
                                  {canEdit && (
                                    <div
                                      onMouseDown={(e) => handleMouseDownOnBar(e, task, 'resize-end')}
                                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-primary/40 hover:bg-primary z-20 rounded-r-md transition-opacity"
                                      title="Arrastar para alterar data de término"
                                    />
                                  )}

                                  {/* Badge de Desvio de Linha de Base */}
                                  {showBaseline && task.varianceDays !== 0 && (
                                    <div
                                      className={cn(
                                        "absolute -top-3 right-0 text-[8px] font-bold px-1 rounded pointer-events-none",
                                        task.varianceDays > 0
                                          ? "bg-rose-600 text-white"
                                          : "bg-emerald-600 text-white"
                                      )}
                                    >
                                      {task.varianceDays > 0 ? `+${task.varianceDays}d` : `${task.varianceDays}d`}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>

                          <TooltipContent className="p-3 max-w-xs space-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5">
                              {task.code && (
                                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded font-bold">
                                  {task.code}
                                </span>
                              )}
                              <span className="font-bold truncate text-foreground">{task.name}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 border-t text-[11px]">
                              <div>
                                <span className="text-muted-foreground">Início:</span>{' '}
                                <strong>{task.startDate && format(task.startDate, 'dd/MM/yyyy')}</strong>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fim:</span>{' '}
                                <strong>{task.endDate && format(task.endDate, 'dd/MM/yyyy')}</strong>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Duração:</span>{' '}
                                <strong>{task.gantt.duration} dias</strong>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Progresso:</span>{' '}
                                <strong>{task.progress || 0}%</strong>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Folga Total:</span>{' '}
                                <strong className={task.totalSlack === 0 ? 'text-rose-600' : ''}>
                                  {task.totalSlack} dias
                                </strong>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fase:</span>{' '}
                                <strong>{task.category || 'Geral'}</strong>
                              </div>
                            </div>

                            {taskSimulatedShift !== 0 && (
                              <div className="text-[10px] text-purple-600 dark:text-purple-400 pt-1 border-t font-bold">
                                🔮 Desvio Simulado: {taskSimulatedShift > 0 ? `+${taskSimulatedShift} dias` : `${taskSimulatedShift} dias`}
                              </div>
                            )}

                            {task.baselineStartDate && (
                              <div className="text-[10px] text-muted-foreground pt-1 border-t">
                                <strong>Linha de Base:</strong>{' '}
                                {format(task.baselineStartDate, 'dd/MM/yy')} →{' '}
                                {task.baselineEndDate && format(task.baselineEndDate, 'dd/MM/yy')}
                                {task.varianceDays !== 0 && (
                                  <span
                                    className={cn(
                                      "ml-1.5 font-bold",
                                      task.varianceDays > 0 ? "text-rose-600" : "text-emerald-600"
                                    )}
                                  >
                                    ({task.varianceDays > 0 ? `+${task.varianceDays}d atraso` : `${task.varianceDays}d adiantamento`})
                                  </span>
                                )}
                              </div>
                            )}

                            {task.isCritical && (
                              <div className="text-[10px] font-bold text-rose-600 pt-1 border-t flex items-center gap-1">
                                <Flame className="h-3 w-3" />
                                ATIVIDADE CRÍTICA (Afeta a entrega final)
                              </div>
                            )}

                            {canEdit && (
                              <div className="text-[10px] text-primary pt-1 border-t italic">
                                Clique para editar detalhes ou arraste a barra para reprogramar.
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    {/* SETAS SVG DE DEPENDÊNCIA (CPM) E LINHA DE PROGRESSO */}
                    <svg
                      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                      style={{
                        width: dateRange.length * DAY_WIDTH,
                        height: displayRows.length * ROW_HEIGHT,
                      }}
                    >
                      <defs>
                        <ArrowMarker id="arrow-normal" color="hsl(var(--primary))" />
                        <ArrowMarker id="arrow-critical" color="#e11d48" />
                      </defs>
                      {dependencyLines.map((line) => (
                        <g key={line.key}>
                          <path
                            d={line.path}
                            stroke={line.isCritical ? '#e11d48' : 'hsl(var(--primary))'}
                            strokeWidth={line.isCritical ? '2' : '1.5'}
                            fill="none"
                            markerEnd={`url(#${line.isCritical ? 'arrow-critical' : 'arrow-normal'})`}
                            opacity={line.isCritical ? 0.95 : 0.6}
                          />
                          {line.lagLabel && (
                            <text
                              x={line.labelX}
                              y={line.labelY}
                              className="text-[9px] font-mono font-bold fill-primary bg-background"
                              textAnchor="middle"
                              dy="-2"
                            >
                              {line.lagLabel}
                            </text>
                          )}
                        </g>
                      ))}

                      {/* LINHA DE PROGRESSO DENTE-DE-SERRA (STATUS DATE LINE) */}
                      {showProgressLine && progressPolylineString && todayPosition !== null && (
                        <g className="progress-line-layer">
                          <polyline
                            points={progressPolylineString}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.9"
                          />
                          {progressLinePoints?.map((pt, idx) => (
                            <circle
                              key={`pl-dot-${idx}`}
                              cx={pt.x}
                              cy={pt.y}
                              r="4"
                              className={cn(
                                "stroke-background stroke-2",
                                pt.isDelayed
                                  ? "fill-rose-600"
                                  : pt.isAhead
                                  ? "fill-emerald-500"
                                  : "fill-amber-500"
                              )}
                            />
                          ))}
                        </g>
                      )}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </TooltipProvider>

          {/* 4. PAINEL DE CURVA S E HISTOGRAMA TEMPORAL ALINHADO */}
          <div className="no-print">
            <GanttSCurvePanel
              tasks={tasks}
              dateRange={dateRange}
              dayWidth={DAY_WIDTH}
              open={isSCurveOpen}
              onToggle={() => setIsSCurveOpen(!isSCurveOpen)}
            />
          </div>
        </CardContent>
      </Card>

      {/* BLOCO FORMAL DE ASSINATURAS E CARIMBOS (APENAS NA IMPRESSÃO DIRETA) */}
      <div className="print-only print-break-inside-avoid mt-6 pt-4 border-t-2 border-slate-900 text-black">
        <div className="text-[11px] font-bold uppercase mb-3 text-slate-800 flex items-center justify-between">
          <span>Termo de Responsabilidade Técnica & Vistos de Homologação</span>
          <span className="font-mono text-[9px] font-normal text-slate-500">Padrão FIDIC / OEA • Luanda, {format(new Date(), 'dd/MM/yyyy')}</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-slate-300 p-2.5 text-center rounded-xs bg-slate-50">
            <div className="text-[9px] font-bold text-slate-700 uppercase">Diretor de Obra / Empreiteiro</div>
            <div className="h-10 border-b border-dashed border-slate-400 my-2"></div>
            <div className="text-[9px] font-semibold text-slate-900">{projectInfo.contractorName}</div>
            <div className="text-[8px] text-emerald-700 font-mono font-bold mt-0.5">Assinado Digitalmente • {format(new Date(), 'dd/MM/yyyy')}</div>
          </div>
          <div className="border border-slate-300 p-2.5 text-center rounded-xs bg-slate-50">
            <div className="text-[9px] font-bold text-slate-700 uppercase">Fiscalização da Empreitada</div>
            <div className="h-10 border-b border-dashed border-slate-400 my-2"></div>
            <div className="text-[9px] font-semibold text-slate-900">Gabinete de Fiscalização Técnica</div>
            <div className="text-[8px] text-blue-700 font-mono font-bold mt-0.5">Homologado com Visto • {format(new Date(), 'dd/MM/yyyy')}</div>
          </div>
          <div className="border border-slate-300 p-2.5 text-center rounded-xs bg-slate-50">
            <div className="text-[9px] font-bold text-slate-700 uppercase">Dono da Obra / Entidade Contratante</div>
            <div className="h-10 border-b border-dashed border-slate-400 my-2"></div>
            <div className="text-[9px] font-semibold text-slate-900">{projectInfo.clientName}</div>
            <div className="text-[8px] text-slate-700 font-mono font-bold mt-0.5">Aprovado para Execução • {format(new Date(), 'dd/MM/yyyy')}</div>
          </div>
        </div>
        <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono mt-3">
          <span>PROFUNDIDADE OS • RELATÓRIO OFICIAL DE CRONOGRAMA & CAMINHO CRÍTICO</span>
          <span>REGISTO AUDITÁVEL SHA-256 • EMISSÃO OFICIAL WAT (UTC+1)</span>
        </div>
      </div>

      {/* 5. MODAL DE EDIÇÃO INTERATIVA DE ATIVIDADE */}
      <GanttTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        task={selectedTask}
        allTasks={tasks}
        projectId={projectId}
      />

      {/* 6. MODAL DE GRAVAÇÃO DE LINHA DE BASE */}
      <GanttBaselineModal
        open={isBaselineModalOpen}
        onOpenChange={setIsBaselineModalOpen}
        projectId={projectId}
        tasks={tasks}
      />

      {/* 7. MODAL DE ADIÇÃO RÁPIDA DE ATIVIDADE */}
      <GanttNewTaskDialog
        open={isNewTaskDialogOpen}
        onOpenChange={setIsNewTaskDialogOpen}
        projectId={projectId}
        existingTasks={tasks}
      />

      {/* 8. MODAL DE REPROGRAMAÇÃO EM CASCATA */}
      <GanttCascadeModal
        open={isCascadeModalOpen}
        onOpenChange={setIsCascadeModalOpen}
        projectId={projectId}
        tasks={tasks}
      />

      {/* 9. MODAL DE IMPORTAÇÃO (MS PROJECT XML / CSV) */}
      <GanttImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        projectId={projectId}
      />

      {/* 10. MODAL DE IMPRESSÃO ULTRA PROFISSIONAL & DOSSIÊ PDF */}
      <GanttPrintModal
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        projectId={projectId}
        projectName={projectInfo.name}
        projectCode={projectInfo.code}
        clientName={projectInfo.clientName}
        tasks={tasks}
      />
    </div>
  );
}
