import { getReactivePermissions } from "@/core/config";
import { checkPermissionSync, hasPermission } from "@/core/evaluator";
import { logDebug } from "@/utils/debug";
import type { DirectiveBinding } from "vue";
import { isRef, watch } from "vue";

/**
 * v-permission directive
 * -----------------------
 * Usage:
 * <button v-permission="'admin'">Admin Only</button>
 * <div v-permission:show="['editor','moderator']">Visible only for editors</div>
 */

interface PermissionElement extends HTMLElement {
  _vPermissionOriginalDisplay?: string;
  _vPermissionSkipUpdates?: boolean;
  _vPermissionParent?: Node | null;
  _vPermissionNextSibling?: Node | null;
  _vPermissionComment?: Comment | null;
  _vPermissionValueRef?: any;
  _vPermissionUnwatch?: () => void;
  _vPermissionUseShow?: boolean;
}

/**
 * Resolve the binding value, unwrapping a Ref if necessary.
 */
function resolveValue(el: PermissionElement, raw: any): any {
  const storedRef = el._vPermissionValueRef;
  if (storedRef && isRef(storedRef)) return storedRef.value;
  if (isRef(raw)) return raw.value;
  return raw;
}

/**
 * Capture the element's original display value so we can restore it later
 * when toggling via the .show / :show modifier.
 */
function captureOriginalDisplay(el: PermissionElement): void {
  try {
    const computed = window.getComputedStyle(el);
    el._vPermissionOriginalDisplay = computed.display || el.style.display || "";
  } catch {
    el._vPermissionOriginalDisplay = el.style.display || "";
  }
}

/**
 * Remove element from DOM by replacing it with a comment placeholder.
 */
function removeFromDom(el: PermissionElement): void {
  if (el.parentNode && !el._vPermissionComment) {
    const comment = document.createComment("v-permission");
    el._vPermissionParent = el.parentNode;
    el._vPermissionNextSibling = el.nextSibling;
    el._vPermissionComment = comment;
    el.replaceWith(comment);
    logDebug("Removed element from DOM");
  }
}

/**
 * Restore element previously removed from DOM via the comment placeholder.
 */
function restoreToDom(el: PermissionElement): void {
  if (el._vPermissionComment) {
    const comment = el._vPermissionComment;
    if (!el.parentNode) {
      comment.replaceWith(el);
    } else {
      comment.remove();
    }
    el._vPermissionComment = undefined;
  }
}

/**
 * Apply the resolved permission state to the element.
 * Handles both DOM removal and display:none strategies.
 */
function applyPermissionState(el: PermissionElement, value: any): void {
  const useShow = el._vPermissionUseShow === true;
  const allowed = checkPermissionSync(value);

  if (allowed) {
    restoreToDom(el);
    if (useShow) {
      el.style.display = el._vPermissionOriginalDisplay || "";
    }
  } else if (useShow) {
    el.style.display = "none";
  } else {
    removeFromDom(el);
  }

  // Populate the async cache in the background. Don't let the result override
  // the sync decision above — the sync evaluator already covers every mode
  // supported by hasPermission.
  hasPermission(value).catch((e) => {
    console.error("[v-permission] Async evaluation failed:", e);
  });
}

export const vPermission = {
  mounted(el: PermissionElement, binding: DirectiveBinding) {
    const { modifiers, arg } = binding;

    el._vPermissionUseShow = arg === "show" || modifiers.show === true;
    el._vPermissionValueRef = isRef(binding.value) ? binding.value : null;

    captureOriginalDisplay(el);

    if (modifiers.once) {
      el._vPermissionSkipUpdates = true;
    }

    const value = resolveValue(el, binding.value);
    applyPermissionState(el, value);
    logDebug("Mounted v-permission =>", value);

    // Re-evaluate when the global permissions ref changes
    // (e.g., after login/logout via setPermissions or configurePermission).
    if (!modifiers.once) {
      const stop = watch(
        getReactivePermissions(),
        () => {
          if (el._vPermissionSkipUpdates) return;
          const current = resolveValue(el, binding.value);
          applyPermissionState(el, current);
        },
        { deep: true },
      );
      el._vPermissionUnwatch = stop;
    }
  },

  updated(el: PermissionElement, binding: DirectiveBinding) {
    if (el._vPermissionSkipUpdates) return;

    const value = resolveValue(el, binding.value);
    let oldValue = binding.oldValue;
    if (isRef(oldValue)) oldValue = oldValue.value;

    const valueChanged = JSON.stringify(value) !== JSON.stringify(oldValue);

    // .lazy: only re-evaluate when the binding value itself changes.
    if (binding.modifiers.lazy && !valueChanged) return;

    if (valueChanged && el.parentNode) {
      captureOriginalDisplay(el);
    }

    applyPermissionState(el, value);
  },

  unmounted(el: PermissionElement) {
    if (el._vPermissionUnwatch) {
      el._vPermissionUnwatch();
      el._vPermissionUnwatch = undefined;
    }
    if (el._vPermissionComment) {
      el._vPermissionComment.remove();
    }
    delete el._vPermissionOriginalDisplay;
    delete el._vPermissionSkipUpdates;
    delete el._vPermissionParent;
    delete el._vPermissionNextSibling;
    delete el._vPermissionComment;
    delete el._vPermissionValueRef;
    delete el._vPermissionUseShow;
  },
};

export {};
