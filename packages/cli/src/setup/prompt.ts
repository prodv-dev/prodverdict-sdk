import readline from 'node:readline';
import { stdin, stdout } from 'node:process';

/** Open a readline interface for a single prompt. Caller must close it. */
function openRl(): readline.Interface {
  return readline.createInterface({ input: stdin, output: stdout, terminal: false });
}

/** Prompt the user with a yes/no question. Defaults to `defaultYes` on empty input. */
export async function promptYesNo(
  question: string,
  defaultYes = true,
): Promise<boolean> {
  const rl = openRl();
  const suffix = defaultYes ? ' [Y/n] ' : ' [y/N] ';
  return new Promise<boolean>((resolve) => {
    rl.question(question + suffix, (answer) => {
      rl.close();
      const v = answer.trim().toLowerCase();
      if (v === '') return resolve(defaultYes);
      return resolve(v === 'y' || v === 'yes');
    });
  });
}

/** Prompt the user to press Enter to continue. Returns when Enter is pressed. */
export async function pressEnterToContinue(prompt: string): Promise<void> {
  const rl = openRl();
  return new Promise<void>((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

/** Print a dim section divider line. */
export function divider(width = 60): string {
  return '─'.repeat(width);
}
