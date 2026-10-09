/* Window events other parts of the shell use to talk to the mascot
   (components/mascot/ShellMascot.tsx listens). */

/** Open the mascot chat and ask this question (Spotlight's "Ask my AI"). */
export const ASK_MASCOT_EVENT = "portfolio:ask-mascot";

export function askMascot(question: string) {
  window.dispatchEvent(new CustomEvent(ASK_MASCOT_EVENT, { detail: { question } }));
}
