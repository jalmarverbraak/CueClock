import type { Command } from '@cueclock/shared';
import { Engine, EngineError } from './engine';

export function applyCommand(engine: Engine, command: Command): void {
  switch (command.type) {
    case 'startQuick':
      engine.startQuick(command.durationSeconds);
      return;
    case 'startBlock':
      engine.jumpToBlock(command.scheduleId, command.blockId);
      return;
    case 'startSchedule':
      engine.startSchedule(command.scheduleId);
      return;
    case 'nextBlock':
      engine.nextBlock();
      return;
    case 'pause':
      engine.pause();
      return;
    case 'resume':
      engine.resume();
      return;
    case 'reset':
      engine.reset();
      return;
    case 'addSeconds':
      engine.addSeconds(command.seconds);
      return;
    case 'setSpeed':
      engine.setSpeed(command.speedPercent);
      return;
    case 'setMessage':
      engine.setMessage(command.text);
      return;
    case 'setThresholds':
      engine.setThresholds(command.thresholds);
      return;
    case 'savePreset':
      engine.savePreset(command.name, command.durationSeconds);
      return;
    case 'deletePreset':
      engine.deletePreset(command.id);
      return;
    case 'saveQuickMessage':
      engine.saveQuickMessage(command.text);
      return;
    case 'deleteQuickMessage':
      engine.deleteQuickMessage(command.id);
      return;
    case 'saveSchedule':
      engine.saveSchedule(command.schedule);
      return;
    case 'deleteSchedule':
      engine.deleteSchedule(command.id);
      return;
    default: {
      const exhaustive: never = command;
      throw new EngineError(`Unknown command: ${JSON.stringify(exhaustive)}`);
    }
  }
}
