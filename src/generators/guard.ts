/**
 * The shared shape of every generator's permissions-guard hook command
 * (specs/permissions-baseline PB-8): an inline `node -e` wrapper that forwards the
 * tool's raw hook event to the tool-neutral guard on stdin and translates the
 * guard's three exit codes (0 allow, 2 deny, 3 ask) into that tool's own decision
 * channel.
 *
 * Only the translation differs per tool, so each generator passes its own three
 * output snippets and this module owns the rest — the same split as the feedback
 * stop wrappers, without five copies of the spawning boilerplate (S5). Each snippet
 * is plain CommonJS, may read the variable `reason` (the guard's one-line stderr),
 * and may assign `code` (the wrapper's own exit code, `0` unless a snippet sets it).
 * A guard exit other than 0/2/3 — a crash — is treated as allow and its stderr is
 * passed through: a guard bug never breaks the agent's tool call.
 */
import { wrapPosixShellArg } from './json.js';

export interface GuardChannel {
  readonly deny: string;
  readonly ask: string;
  readonly allow: string;
}

/** Writes `value` as one line of JSON on stdout — for use inside a snippet. */
export function emitJson(value: string): string {
  return `process.stdout.write(JSON.stringify(${value})+String.fromCharCode(10));`;
}

function guardWrapperScript(channel: GuardChannel): string {
  return [
    'const cp=require("child_process");',
    'const fs=require("fs");',
    'const guard=process.argv[1];',
    'let input;',
    'try{input=fs.readFileSync(0);}catch(e){input=Buffer.from("");}',
    'const r=cp.spawnSync("node",[guard],{input});',
    'const reason=(r.stderr?r.stderr.toString():"").trim();',
    'let code=0;',
    `if(r.status===2){${channel.deny}}`,
    `else if(r.status===3){${channel.ask}}`,
    'else{if(reason.length>0){process.stderr.write(reason+String.fromCharCode(10));}',
    `${channel.allow}}`,
    'process.exit(code);',
  ].join('');
}

/** The full hook command: the wrapper, then the guard's path as its one argument. */
export function guardCommand(guardPath: string, channel: GuardChannel): string {
  return `node --input-type=commonjs -e ${wrapPosixShellArg(guardWrapperScript(channel))} -- "${guardPath}"`;
}
