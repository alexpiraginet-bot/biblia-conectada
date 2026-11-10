// Storage names of the notebook, on their own so the reading pages can look for a notebook without loading its model.
export const CADERNO_KEY = "bc:caderno:v1";
/** dispatched on window after this tab writes, so open pages update (other tabs get the "storage" event) */
export const CADERNO_EVENT = "bc:caderno";
/** unreadable notebooks set aside by "Recomeçar o caderno", one JSON list of { em, raw } */
export const CADERNO_RECOVERY_KEY = "bc:caderno:recovery:v1";
