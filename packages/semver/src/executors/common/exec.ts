import { execFile, type ChildProcess } from 'child_process';
import { Observable, type Subscriber } from 'rxjs';

export function exec(cmd: string, args: string[] = [], retries: number = 0): Observable<string> {
  return new Observable((subscriber: Subscriber<string>) => {
    const process = execFile(cmd, args, (error, stdout, stderr) => {
      if (error) {
        if (retries > 0) {
          setTimeout(() => exec(cmd, args, retries - 1).subscribe(subscriber), Math.pow(2, retries) * 1000);
        } else {
          subscriber.error(new Error(stderr));
        }
        return;
      }

      subscriber.next(stdout);
      subscriber.complete();
    });

    const _removeEvents = _listenExitEvent(() => subscriber.complete());

    return () => {
      _killProcess(process);
      _removeEvents();
    };
  });
}

function _killProcess(process: ChildProcess): void {
  if (process.stdout) {
    process.stdout.removeAllListeners();
  }

  if (process.stderr) {
    process.stderr.removeAllListeners();
  }

  process.removeAllListeners();
  process.kill('SIGKILL');
}

function _listenExitEvent(
  fn: (signal: number) => void,
  events: NodeJS.Signals[] = ['SIGINT', 'SIGBREAK']
): () => void {
  events.forEach((name) => process.on(name, fn));
  process.on('exit', fn);

  return () => {
    events.forEach((name) => process.off(name, fn));
    process.off('exit', fn);
  };
}
