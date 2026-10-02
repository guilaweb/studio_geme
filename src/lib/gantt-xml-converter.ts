/**
 * Utilitário de Conversão e Interoperabilidade Microsoft Project XML (MSPDI)
 * Compatível com Microsoft Project 2013-2024, Primavera P6 e LibreProject.
 */

import type { WbsItem } from '@/types/wbs';
import { format, parseISO, differenceInDays } from 'date-fns';

/**
 * Serializa uma lista de WbsItem no formato XML oficial do Microsoft Project.
 */
export function exportToMsProjectXml(tasks: WbsItem[], projectName: string): string {
  const nowStr = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

  const taskMap = new Map(tasks.map((t, idx) => [t.id, idx + 1]));

  const tasksXml = tasks
    .map((task, idx) => {
      const uid = idx + 1;
      const id = uid;
      const name = escapeXml(task.name || 'Atividade');
      const wbs = escapeXml(task.code || `${uid}`);
      const start = task.startDate ? format(task.startDate instanceof Date ? task.startDate : (task.startDate as any).toDate(), "yyyy-MM-dd'T'08:00:00") : nowStr;
      const end = task.endDate ? format(task.endDate instanceof Date ? task.endDate : (task.endDate as any).toDate(), "yyyy-MM-dd'T'17:00:00") : nowStr;
      const durationHours = task.isMilestone ? 0 : (task.durationDays || 1) * 8;
      const durationStr = `PT${durationHours}H0M0S`;
      const percentComplete = task.progress || 0;
      const milestone = task.isMilestone ? 1 : 0;
      const critical = task.isCriticalPath ? 1 : 0;

      // Predecessoras (PredecessorLink)
      const predecessorXml = (task.dependencies || [])
        .map((depId) => {
          const predUid = taskMap.get(depId);
          if (!predUid) return '';
          const lagMinutes = ((task as any).dependencyLagDays || 0) * 8 * 60;
          return `
      <PredecessorLink>
        <PredecessorUID>${predUid}</PredecessorUID>
        <Type>1</Type> <!-- 1 = Finish-to-Start (FS) -->
        <CrossProject>0</CrossProject>
        <LinkLag>${lagMinutes * 10}</LinkLag>
        <LagFormat>7</LagFormat>
      </PredecessorLink>`;
        })
        .join('');

      return `
    <Task>
      <UID>${uid}</UID>
      <ID>${id}</ID>
      <Name>${name}</Name>
      <Type>0</Type>
      <IsNull>0</IsNull>
      <WBS>${wbs}</WBS>
      <OutlineNumber>${wbs}</OutlineNumber>
      <OutlineLevel>${task.level === 'phase' ? 1 : task.level === 'subphase' ? 2 : 3}</OutlineLevel>
      <Priority>500</Priority>
      <Start>${start}</Start>
      <Finish>${end}</Finish>
      <Duration>${durationStr}</Duration>
      <DurationFormat>7</DurationFormat>
      <Work>PT${durationHours}H0M0S</Work>
      <PercentComplete>${percentComplete}</PercentComplete>
      <PercentWorkComplete>${percentComplete}</PercentWorkComplete>
      <Milestone>${milestone}</Milestone>
      <Critical>${critical}</Critical>
      ${predecessorXml}
    </Task>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${escapeXml(projectName)}</Name>
  <Title>${escapeXml(projectName)}</Title>
  <Company>Profundidade Engenharia &amp; Mineração</Company>
  <CreationDate>${nowStr}</CreationDate>
  <LastSaved>${nowStr}</LastSaved>
  <ScheduleFromStart>1</ScheduleFromStart>
  <StartDate>${nowStr}</StartDate>
  <CalendarUID>1</CalendarUID>
  <Tasks>
    ${tasksXml}
  </Tasks>
</Project>`;
}

/**
 * Faz o parsing de um ficheiro XML do Microsoft Project em objetos WbsItem.
 */
export function parseMsProjectXml(xmlString: string): Partial<WbsItem>[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const taskNodes = xmlDoc.getElementsByTagName('Task');
  const parsedTasks: Partial<WbsItem>[] = [];

  for (let i = 0; i < taskNodes.length; i++) {
    const node = taskNodes[i];
    const name = node.getElementsByTagName('Name')[0]?.textContent || `Atividade ${i + 1}`;
    const code = node.getElementsByTagName('WBS')[0]?.textContent || node.getElementsByTagName('OutlineNumber')[0]?.textContent || '';
    const startText = node.getElementsByTagName('Start')[0]?.textContent;
    const finishText = node.getElementsByTagName('Finish')[0]?.textContent;
    const percentText = node.getElementsByTagName('PercentComplete')[0]?.textContent;
    const milestoneText = node.getElementsByTagName('Milestone')[0]?.textContent;

    if (!startText || !finishText) continue;

    const startDate = new Date(startText);
    const endDate = new Date(finishText);
    const isMilestone = milestoneText === '1' || milestoneText === 'true';
    const durationDays = isMilestone ? 0 : Math.max(1, differenceInDays(endDate, startDate) + 1);
    const progress = parseInt(percentText || '0', 10) || 0;

    parsedTasks.push({
      name,
      code: code || undefined,
      startDate,
      endDate,
      durationDays,
      progress,
      status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started',
      isMilestone,
      level: 'activity',
      category: 'Estrutura',
    });
  }

  return parsedTasks;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
