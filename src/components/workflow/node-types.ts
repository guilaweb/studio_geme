'use client';

import TriggerNode from './trigger-node';
import ActionNode from './action-node';
import IfNode from './if-node';

export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  if: IfNode,
};
