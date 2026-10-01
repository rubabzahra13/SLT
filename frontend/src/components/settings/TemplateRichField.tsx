"use client";

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import clsx from "clsx";
import { formatPlaceholderLabel } from "@/lib/email-templates";

const VAR_ATTR = "data-template-var";

export function variableDisplayName(
  key: string,
  hints?: Record<string, string>
): string {
  return hints?.[key] ?? formatPlaceholderLabel(key);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function chipClassName(): string {
  return "mx-0.5 inline-flex max-w-full items-center rounded-md bg-brand-blue-soft/70 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-signature ring-1 ring-inset ring-brand-signature/20 align-middle";
}

function chipHtml(key: string, hints?: Record<string, string>): string {
  const label = escapeHtml(variableDisplayName(key, hints));
  return `<span ${VAR_ATTR}="${escapeHtml(key)}" contenteditable="false" class="${chipClassName()}">${label}</span>`;
}

export function templateToEditableHtml(
  text: string,
  multiline: boolean,
  hints?: Record<string, string>
): string {
  if (!text) return "";
  const parts = text.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);
  return parts
    .map((part) => {
      const match = part.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
      if (match) return chipHtml(match[1], hints);
      const escaped = escapeHtml(part);
      return multiline ? escaped.replace(/\n/g, "<br>") : escaped.replace(/\n/g, " ");
    })
    .join("");
}

export function serializeTemplateEditable(
  root: HTMLElement,
  multiline: boolean
): string {
  let out = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const varKey = el.getAttribute(VAR_ATTR);
    if (varKey) {
      out += `{{${varKey}}}`;
      return;
    }

    const tag = el.tagName;
    if (multiline && tag === "BR") {
      out += "\n";
      return;
    }
    if (multiline && tag === "DIV" && el !== root) {
      if (out.length > 0 && !out.endsWith("\n")) out += "\n";
      el.childNodes.forEach(walk);
      return;
    }
    el.childNodes.forEach(walk);
  };

  root.childNodes.forEach(walk);
  return out.replace(/\u200B/g, "");
}

export function insertVariableChipAtSelection(
  root: HTMLElement,
  key: string,
  hints?: Record<string, string>
): void {
  root.focus();
  const selection = window.getSelection();
  if (!selection) return;

  let range: Range;
  if (selection.rangeCount === 0 || !root.contains(selection.anchorNode)) {
    range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
  } else {
    range = selection.getRangeAt(0);
  }

  range.deleteContents();
  const wrapper = document.createElement("span");
  wrapper.innerHTML = chipHtml(key, hints);
  const chip = wrapper.firstChild;
  if (!chip || chip.nodeType !== Node.ELEMENT_NODE) return;
  range.insertNode(chip);

  const spacer = document.createTextNode("\u200B");
  (chip as HTMLElement).after(spacer);
  range.setStart(spacer, 1);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

type TemplateRichFieldProps = {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  readOnly?: boolean;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
  variableHints?: Record<string, string>;
};

export const TemplateRichField = forwardRef<HTMLDivElement, TemplateRichFieldProps>(
  function TemplateRichField(
    {
      value,
      onChange,
      multiline = false,
      readOnly = false,
      onFocus,
      placeholder,
      className,
      ariaLabel,
      variableHints,
    },
    ref
  ) {
    const innerRef = useRef<HTMLDivElement>(null);
    const lastValueRef = useRef(value);

    const setRefs = (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const syncFromValue = useCallback(() => {
      const el = innerRef.current;
      if (!el || readOnly) return;
      el.innerHTML = templateToEditableHtml(value, multiline, variableHints);
      lastValueRef.current = value;
    }, [value, multiline, variableHints, readOnly]);

    useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el || readOnly) return;
      const serialized = serializeTemplateEditable(el, multiline);
      if (value === serialized) {
        lastValueRef.current = value;
        return;
      }
      syncFromValue();
    }, [value, syncFromValue, readOnly, multiline]);

    useLayoutEffect(() => {
      if (readOnly) return;
      syncFromValue();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount hydrate only
    }, []);

    const handleInput = () => {
      const el = innerRef.current;
      if (!el) return;
      const next = serializeTemplateEditable(el, multiline);
      lastValueRef.current = next;
      onChange(next);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (!multiline && event.key === "Enter") {
        event.preventDefault();
      }
    };

    if (readOnly) {
      return (
        <div
          className={clsx(
            "text-brand-ink",
            multiline && "min-h-[360px] whitespace-pre-wrap leading-[1.65]",
            !multiline && "leading-snug font-medium",
            className
          )}
        >
          {value ? (
            <TemplateRichFieldStatic value={value} variableHints={variableHints} />
          ) : (
            <span className="text-brand-ink-tertiary">{placeholder ?? "Empty"}</span>
          )}
        </div>
      );
    }

    return (
      <div
        ref={setRefs}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline={multiline}
        contentEditable
        suppressContentEditableWarning
        onFocus={onFocus}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={clsx(
          "outline-none empty:before:text-brand-ink-tertiary empty:before:content-[attr(data-placeholder)]",
          multiline && "min-h-[360px] whitespace-pre-wrap leading-[1.65]",
          !multiline && "leading-snug font-medium",
          className
        )}
      />
    );
  }
);

export function TemplateRichFieldStatic({
  value,
  variableHints,
}: {
  value: string;
  variableHints?: Record<string, string>;
}) {
  const parts = value.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
        if (match) {
          const key = match[1];
          return (
            <span key={index} className={chipClassName()}>
              {variableDisplayName(key, variableHints)}
            </span>
          );
        }
        // Keep newlines visible inside spans under whitespace-pre-wrap.
        if (!part) return null;
        return (
          <span key={index}>
            {part.split("\n").map((line, lineIndex, lines) => (
              <span key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
}
