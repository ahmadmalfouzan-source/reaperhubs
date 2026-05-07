import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 3000,
    });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 5000,
    });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 4000,
    });
  },
  transmission: {
    sent: () => toast.success("Transmission broadcasted", "Signal locked and transmitted to the collective."),
    error: () => toast.error("Transmission failed", "Field interference detected. Signal lost."),
    deleted: () => toast.success("Transmission terminated", "Data purged from the active registry."),
    updated: () => toast.success("Transmission recalibrated", "Registry entry updated successfully."),
  },
  archive: {
    added: () => toast.success("Archive entry secured", "Data point added to your classified repository."),
    removed: () => toast.success("Archive entry purged", "Item removed from your active collection."),
    synced: () => toast.success("Central sync complete", "Local intel successfully mirrored to mainframe."),
    error: () => toast.error("Archive failure", "Database link severed. Retry synchronization."),
  },
  intel: {
    neutralized: (target: string) => toast.success(`${target} neutralized`, "Priority target eliminated from active list."),
    session: () => toast.success("Session debrief logged", "Tactical progress updated in the mainframe."),
  }
};
