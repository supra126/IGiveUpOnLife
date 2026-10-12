"use client";

/**
 * 文字 / Logo 圖層編輯器（react-konva，只在開啟時才載入）
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Image as KonvaImage, Layer as KonvaLayer, Stage, Text as KonvaText, Transformer } from "react-konva";
import type Konva from "konva";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Trash,
  Type,
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useAssetUpload } from "@/components/workbench/useAssetUpload";
import { useAssetUrl } from "@/lib/project/asset-url";
import { getAssetRecord, loadLayerDoc, updateProject, useWorkspace } from "@/lib/project/store";
import { createId, type Generation } from "@/lib/project/types";
import {
  emptyDoc,
  fromPixels,
  toPixels,
  LAYER_DOC_VERSION,
  type ImageLayer,
  type Layer,
  type LayerDoc,
  type TextLayer,
} from "@/lib/editor/model";
import { EDITOR_FONTS, DEFAULT_FONT, ensureFontStylesheet, loadFontsFor, nearestWeight } from "@/lib/editor/fonts";
import { buildTemplate, TEMPLATE_IDS, type TemplateId } from "@/lib/editor/templates";
import { applyLayersTo, saveLayers } from "@/lib/editor/apply";
import { showToast } from "@/lib/workbench/toast";

interface Props {
  generation: Generation;
  onClose: () => void;
}

function useHtmlImage(url: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
  }, [url]);
  return image;
}

// --- 畫布上的節點 ---

interface NodeProps<L extends Layer> {
  layer: L;
  size: { width: number; height: number };
  selected: boolean;
  onSelect: () => void;
  onChange: (layer: Layer) => void;
  registerNode: (id: string, node: Konva.Node | null) => void;
  fontTick: number;
}

function TextNode({ layer, size, onSelect, onChange, registerNode, fontTick }: NodeProps<TextLayer>) {
  const ref = useRef<Konva.Text>(null);
  const px = toPixels(layer, size);

  // 文字高度取決於內容與字型，每次重繪後把旋轉中心設回中心點
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.offsetY(node.height() / 2);
    node.getLayer()?.batchDraw();
  });

  // 字型晚一步載入時，在原節點上重新量測文字。不重建節點，否則正在進行的拖曳和選取框會失效
  useLayoutEffect(() => {
    const node = ref.current as (Konva.Text & { _setTextData?: () => void }) | null;
    if (!node || fontTick === 0) return;
    node._setTextData?.();
    node.offsetY(node.height() / 2);
    node.getLayer()?.batchDraw();
  }, [fontTick]);

  const setRef = useCallback(
    (node: Konva.Text | null) => {
      ref.current = node;
      registerNode(layer.id, node);
    },
    [layer.id, registerNode]
  );

  return (
    <KonvaText
      ref={setRef}
      name="layer"
      draggable
      x={px.cx}
      y={px.cy}
      width={px.width}
      offsetX={px.width / 2}
      rotation={layer.rotation}
      opacity={layer.opacity}
      text={layer.text}
      fontFamily={`"${layer.fontFamily}"`}
      fontStyle={String(layer.fontWeight)}
      fontSize={px.fontSize}
      fill={layer.fill}
      align={layer.align}
      lineHeight={layer.lineHeight}
      letterSpacing={layer.letterSpacing * px.fontSize}
      wrap="word"
      stroke={layer.stroke?.color}
      strokeWidth={layer.stroke ? layer.stroke.width * px.unit : 0}
      fillAfterStrokeEnabled
      shadowEnabled={Boolean(layer.shadow)}
      shadowColor={layer.shadow?.color}
      shadowBlur={layer.shadow ? layer.shadow.blur * px.unit : 0}
      shadowOffsetX={layer.shadow ? layer.shadow.offsetX * px.unit : 0}
      shadowOffsetY={layer.shadow ? layer.shadow.offsetY * px.unit : 0}
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragEnd={(e) =>
        onChange(fromPixels(layer, size, { cx: e.target.x(), cy: e.target.y(), width: px.width, rotation: layer.rotation }))
      }
    />
  );
}

function ImageNode({ layer, size, onSelect, onChange, registerNode }: NodeProps<ImageLayer>) {
  const ref = useRef<Konva.Image>(null);
  const url = useAssetUrl(layer.assetId);
  const image = useHtmlImage(url);
  const px = toPixels(layer, size);
  const height = px.width * layer.aspect;

  const setRef = useCallback(
    (node: Konva.Image | null) => {
      ref.current = node;
      registerNode(layer.id, node);
    },
    [layer.id, registerNode]
  );

  if (!image) return null;
  return (
    <KonvaImage
      ref={setRef}
      name="layer"
      image={image}
      draggable
      x={px.cx}
      y={px.cy}
      width={px.width}
      height={height}
      offsetX={px.width / 2}
      offsetY={height / 2}
      rotation={layer.rotation}
      opacity={layer.opacity}
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragEnd={(e) =>
        onChange(fromPixels(layer, size, { cx: e.target.x(), cy: e.target.y(), width: px.width, rotation: layer.rotation }))
      }
    />
  );
}

// --- 屬性面板 ---

function Field({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInspector({ layer, onChange }: { layer: TextLayer; onChange: (patch: Partial<TextLayer>) => void }) {
  const { t } = useLocale();
  const font = EDITOR_FONTS.find((f) => f.family === layer.fontFamily) ?? EDITOR_FONTS[0];
  return (
    <div className="space-y-3">
      <Field label={t("editor.text")} htmlFor="layer-text">
        <textarea
          id="layer-text"
          className="control min-h-[64px] resize-y"
          value={layer.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <Field label={t("editor.font")} htmlFor="layer-font">
          <select
            id="layer-font"
            className="control"
            value={layer.fontFamily}
            onChange={(e) =>
              onChange({ fontFamily: e.target.value, fontWeight: nearestWeight(e.target.value, layer.fontWeight) })
            }
          >
            {EDITOR_FONTS.map((f) => (
              <option key={f.family} value={f.family}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("editor.weight")} htmlFor="layer-weight">
          <select
            id="layer-weight"
            className="control"
            value={layer.fontWeight}
            onChange={(e) => onChange({ fontWeight: Number(e.target.value) })}
          >
            {font.weights.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("editor.size")} htmlFor="layer-size">
        <input
          id="layer-size"
          type="range"
          min={1}
          max={25}
          step={0.1}
          className="w-full accent-[var(--accent)]"
          value={layer.fontSize * 100}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) / 100 })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("editor.color")} htmlFor="layer-color">
          <input
            id="layer-color"
            type="color"
            className="h-8 w-full cursor-pointer rounded border border-line bg-panel"
            value={layer.fill}
            onChange={(e) => onChange({ fill: e.target.value })}
          />
        </Field>
        <Field label={t("editor.opacity")} htmlFor="layer-opacity">
          <input
            id="layer-opacity"
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            className="w-full accent-[var(--accent)]"
            value={layer.opacity}
            onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          />
        </Field>
      </div>
      <div>
        <span className="label">{t("editor.align")}</span>
        <Segmented<TextLayer["align"]>
          size="sm"
          label={t("editor.align")}
          value={layer.align}
          onChange={(align) => onChange({ align })}
          options={(["left", "center", "right"] as const).map((v) => ({ value: v, label: t(`editor.alignOptions.${v}`) }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("editor.lineHeight")} htmlFor="layer-lh">
          <input
            id="layer-lh"
            type="number"
            min={0.8}
            max={3}
            step={0.05}
            className="control"
            value={layer.lineHeight}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) || 1.2 })}
          />
        </Field>
        <Field label={t("editor.letterSpacing")} htmlFor="layer-ls">
          <input
            id="layer-ls"
            type="number"
            min={-0.2}
            max={1}
            step={0.01}
            className="control"
            value={layer.letterSpacing}
            onChange={(e) => onChange({ letterSpacing: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="accent-[var(--accent)]"
            checked={Boolean(layer.stroke)}
            onChange={(e) => onChange({ stroke: e.target.checked ? { color: "#111111", width: 0.004 } : undefined })}
          />
          {t("editor.stroke")}
        </label>
        {layer.stroke && (
          <div className="grid grid-cols-2 gap-2 pl-5">
            <input
              type="color"
              aria-label={t("editor.strokeColor")}
              className="h-8 w-full cursor-pointer rounded border border-line bg-panel"
              value={layer.stroke.color}
              onChange={(e) => onChange({ stroke: { ...layer.stroke!, color: e.target.value } })}
            />
            <input
              type="range"
              aria-label={t("editor.strokeWidth")}
              min={0.1}
              max={2}
              step={0.05}
              className="accent-[var(--accent)]"
              value={layer.stroke.width * 100}
              onChange={(e) => onChange({ stroke: { ...layer.stroke!, width: Number(e.target.value) / 100 } })}
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="accent-[var(--accent)]"
            checked={Boolean(layer.shadow)}
            onChange={(e) =>
              onChange({
                shadow: e.target.checked
                  ? { color: "rgba(0,0,0,0.45)", blur: 0.012, offsetX: 0, offsetY: 0.004 }
                  : undefined,
              })
            }
          />
          {t("editor.shadow")}
        </label>
      </div>
    </div>
  );
}

// --- 主元件 ---

export default function TextEditor({ generation, onClose }: Props) {
  const { t } = useLocale();
  const project = useWorkspace((s) => s.project);
  const generations = useWorkspace((s) => s.generations);
  const upload = useAssetUpload();
  const baseUrl = useAssetUrl(generation.assetId);
  const baseImage = useHtmlImage(baseUrl);

  const [doc, setDoc] = useState<LayerDoc | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [fontTick, setFontTick] = useState(0);
  const [saving, setSaving] = useState<"save" | "apply" | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Node>());
  const logoInputRef = useRef<HTMLInputElement>(null);

  const contentSet = project?.campaign.contentSets.find((s) => s.id === generation.contentSetId);
  const defaultContent = {
    title: contentSet?.title || t("editor.sampleTitle"),
    copy: contentSet?.copy || t("editor.sampleCopy"),
  };

  useEffect(() => {
    ensureFontStylesheet();
    void loadLayerDoc(generation.id).then((loaded) =>
      setDoc(loaded ? { version: LAYER_DOC_VERSION, layers: loaded.layers, updatedAt: loaded.updatedAt } : emptyDoc())
    );
  }, [generation.id]);

  // 字型載入完成後重新量測文字
  useEffect(() => {
    if (!doc) return;
    const items = doc.layers.flatMap((l) =>
      l.type === "text" ? [{ family: l.fontFamily, weight: l.fontWeight, text: l.text }] : []
    );
    let active = true;
    void loadFontsFor(items).then(() => active && setFontTick((n) => n + 1));
    return () => {
      active = false;
    };
    // 只在字型或內容組合改變時重新載入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.layers.map((l) => (l.type === "text" ? `${l.fontFamily}${l.fontWeight}${l.text}` : "")).join("|")]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setFrame({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 依容器大小等比縮放顯示（匯出時用原始解析度）
  const display = useMemo(() => {
    if (!baseImage || !frame.width || !frame.height) return null;
    const scale = Math.min(frame.width / baseImage.naturalWidth, frame.height / baseImage.naturalHeight, 1);
    return { width: Math.round(baseImage.naturalWidth * scale), height: Math.round(baseImage.naturalHeight * scale) };
  }, [baseImage, frame]);

  const registerNode = useCallback((id: string, node: Konva.Node | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selectedId ? nodes.current.get(selectedId) : undefined;
    if (transformer.nodes()[0] !== node) transformer.nodes(node ? [node] : []);
    // 文字內容或字型改變後尺寸會變，讓選取框跟著更新
    transformer.forceUpdate();
    transformer.getLayer()?.batchDraw();
  });

  const updateLayer = useCallback((next: Layer) => {
    setDoc((d) => (d ? { ...d, layers: d.layers.map((l) => (l.id === next.id ? next : l)), updatedAt: Date.now() } : d));
  }, []);

  const patchSelected = (patch: Partial<TextLayer>) => {
    const layer = doc?.layers.find((l) => l.id === selectedId);
    if (layer) updateLayer({ ...layer, ...patch } as Layer);
  };

  const addLayers = (layers: Layer[]) => {
    setDoc((d) => (d ? { ...d, layers: [...d.layers, ...layers], updatedAt: Date.now() } : d));
    setSelectedId(layers[layers.length - 1]?.id ?? null);
  };

  const addText = () =>
    addLayers([
      {
        id: createId(),
        type: "text",
        x: 0.5,
        y: 0.5,
        width: 0.7,
        rotation: 0,
        opacity: 1,
        text: defaultContent.title,
        fontFamily: DEFAULT_FONT,
        fontWeight: 700,
        fontSize: 0.07,
        fill: "#ffffff",
        align: "center",
        lineHeight: 1.25,
        letterSpacing: 0,
        shadow: { color: "rgba(0,0,0,0.45)", blur: 0.012, offsetX: 0, offsetY: 0.004 },
      },
    ]);

  const addLogo = async (assetId: string) => {
    const asset = await getAssetRecord(assetId);
    const aspect = asset?.width && asset.height ? asset.height / asset.width : 1;
    addLayers([{ id: createId(), type: "image", assetId, aspect, x: 0.85, y: 0.1, width: 0.18, rotation: 0, opacity: 1 }]);
  };

  const onTransformEnd = (layer: Layer) => {
    const node = nodes.current.get(layer.id);
    if (!node || !display) return;
    const anchor = transformerRef.current?.getActiveAnchor() ?? "";
    const scale = node.scaleX();
    const width = node.width() * scale;
    node.scaleX(1);
    node.scaleY(1);
    const px = toPixels(layer, display);
    // 拉左右中間的把手只改寬度（換行），拉四角則等比縮放字級
    const fontSize = layer.type === "text" && !anchor.startsWith("middle") ? px.fontSize * scale : px.fontSize;
    updateLayer(fromPixels(layer, display, { cx: node.x(), cy: node.y(), width, fontSize, rotation: node.rotation() }));
  };

  const move = (id: string, delta: -1 | 1) =>
    setDoc((d) => {
      if (!d) return d;
      const index = d.layers.findIndex((l) => l.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= d.layers.length) return d;
      const layers = [...d.layers];
      [layers[index], layers[target]] = [layers[target], layers[index]];
      return { ...d, layers, updatedAt: Date.now() };
    });

  const remove = (id: string) => {
    setDoc((d) => (d ? { ...d, layers: d.layers.filter((l) => l.id !== id), updatedAt: Date.now() } : d));
    setSelectedId(null);
  };

  const duplicate = (layer: Layer) => addLayers([{ ...layer, id: createId(), x: Math.min(layer.x + 0.03, 0.97), y: Math.min(layer.y + 0.03, 0.97) }]);

  const siblings = generations.filter(
    (g) =>
      g.id !== generation.id &&
      g.status === "done" &&
      g.assetId &&
      ((generation.batchId && g.batchId === generation.batchId) ||
        (generation.contentSetId && g.contentSetId === generation.contentSetId))
  );

  const save = async () => {
    if (!doc) return;
    setSaving("save");
    try {
      await saveLayers(generation, doc);
      showToast("success", "editor.saved");
      onClose();
    } catch {
      showToast("error", "editor.saveFailed");
    } finally {
      setSaving(null);
    }
  };

  const applyToGroup = async () => {
    if (!doc || siblings.length === 0) return;
    setSaving("apply");
    try {
      await saveLayers(generation, doc);
      const count = await applyLayersTo(siblings, doc);
      showToast("success", "editor.applied", { count });
    } catch {
      showToast("error", "editor.saveFailed");
    } finally {
      setSaving(null);
    }
  };

  // 鍵盤：Delete 刪除選取的圖層
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (!selectedId || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove(selectedId);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const selected = doc?.layers.find((l) => l.id === selectedId) ?? null;
  const aspect = baseImage ? baseImage.naturalWidth / baseImage.naturalHeight : 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <Button size="sm" variant="secondary" onClick={addText} disabled={!doc}>
          <Type size={13} />
          {t("editor.addText")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!doc}
          onClick={() => (project?.logoAssetId ? addLogo(project.logoAssetId) : logoInputRef.current?.click())}
        >
          <ImagePlus size={13} />
          {t("editor.addLogo")}
        </Button>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const id = await upload(file, "logo");
            if (!id) return;
            updateProject((p) => ({ ...p, logoAssetId: id }));
            await addLogo(id);
          }}
        />
        {project?.logoAssetId && (
          <button
            type="button"
            className="text-xs text-fg-subtle underline-offset-2 hover:text-fg hover:underline"
            onClick={() => logoInputRef.current?.click()}
          >
            {t("editor.replaceLogo")}
          </button>
        )}
        <div className="relative">
          <Button
            size="sm"
            variant="secondary"
            disabled={!doc}
            aria-expanded={templatesOpen}
            onClick={() => setTemplatesOpen((v) => !v)}
          >
            <LayoutTemplate size={13} />
            {t("editor.templates")}
          </Button>
          {templatesOpen && (
            <div role="menu" className="absolute left-0 top-full z-20 mt-1 w-52 rounded-[var(--radius-control)] border border-line bg-panel p-1 shadow-lg">
              {TEMPLATE_IDS.map((id: TemplateId) => (
                <button
                  key={id}
                  role="menuitem"
                  type="button"
                  className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-raised"
                  onClick={() => {
                    setTemplatesOpen(false);
                    // 套用範本會取代目前的文字圖層，保留 Logo
                    setDoc((d) =>
                      d
                        ? {
                            ...d,
                            layers: [
                              ...d.layers.filter((l) => l.type === "image"),
                              ...buildTemplate(id, aspect, defaultContent, createId),
                            ],
                            updatedAt: Date.now(),
                          }
                        : d
                    );
                    setSelectedId(null);
                  }}
                >
                  {t(`editor.templateNames.${id}`)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {siblings.length > 0 && (
            <Button size="sm" variant="secondary" disabled={!doc || saving !== null} onClick={applyToGroup}>
              {saving === "apply" && <Loader2 size={13} className="animate-spin" />}
              {t("editor.applyToGroup", { count: siblings.length })}
            </Button>
          )}
          <Button size="sm" variant="primary" disabled={!doc || saving !== null} onClick={save}>
            {saving === "save" && <Loader2 size={13} className="animate-spin" />}
            {t("editor.save")}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div ref={frameRef} className="relative flex min-h-[50vh] flex-1 items-center justify-center bg-sunken p-4">
          {display && doc && baseImage ? (
            <Stage
              width={display.width}
              height={display.height}
              className="shadow-lg"
              onMouseDown={(e) => {
                if (e.target === e.target.getStage() || e.target.name() === "base") setSelectedId(null);
              }}
            >
              <KonvaLayer>
                <KonvaImage name="base" image={baseImage} width={display.width} height={display.height} />
                {doc.layers.map((layer) =>
                  layer.type === "text" ? (
                    <TextNode
                      key={layer.id}
                      layer={layer}
                      size={display}
                      selected={layer.id === selectedId}
                      onSelect={() => setSelectedId(layer.id)}
                      onChange={updateLayer}
                      registerNode={registerNode}
                      fontTick={fontTick}
                    />
                  ) : (
                    <ImageNode
                      key={layer.id}
                      layer={layer}
                      size={display}
                      selected={layer.id === selectedId}
                      onSelect={() => setSelectedId(layer.id)}
                      onChange={updateLayer}
                      registerNode={registerNode}
                      fontTick={fontTick}
                    />
                  )
                )}
                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  keepRatio={selected?.type === "image"}
                  enabledAnchors={
                    selected?.type === "image"
                      ? ["top-left", "top-right", "bottom-left", "bottom-right"]
                      : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]
                  }
                  borderStroke="#4b8bf5"
                  anchorStroke="#4b8bf5"
                  anchorSize={9}
                  onTransformEnd={() => selected && onTransformEnd(selected)}
                />
              </KonvaLayer>
            </Stage>
          ) : (
            <Loader2 size={20} className="animate-spin text-fg-subtle" />
          )}
        </div>

        <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-t border-line lg:w-72 lg:border-l lg:border-t-0">
          <section className="border-b border-line p-3">
            <h3 className="section-title mb-2">{t("editor.layers")}</h3>
            {doc && doc.layers.length === 0 && <p className="text-xs text-fg-subtle">{t("editor.noLayers")}</p>}
            <ul className="space-y-1">
              {[...(doc?.layers ?? [])].reverse().map((layer) => (
                <li key={layer.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(layer.id)}
                    aria-current={layer.id === selectedId}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
                      layer.id === selectedId ? "bg-accent-soft" : "hover:bg-raised"
                    }`}
                  >
                    {layer.type === "text" ? <Type size={12} /> : <ImagePlus size={12} />}
                    <span className="truncate">{layer.type === "text" ? layer.text || "—" : t("editor.logo")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selected && (
            <section className="p-3">
              <div className="mb-3 flex items-center gap-1">
                <Button size="sm" variant="ghost" iconOnly aria-label={t("editor.bringForward")} onClick={() => move(selected.id, 1)}>
                  <ArrowUp size={13} />
                </Button>
                <Button size="sm" variant="ghost" iconOnly aria-label={t("editor.sendBackward")} onClick={() => move(selected.id, -1)}>
                  <ArrowDown size={13} />
                </Button>
                <Button size="sm" variant="ghost" iconOnly aria-label={t("editor.duplicate")} onClick={() => duplicate(selected)}>
                  <Copy size={13} />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  iconOnly
                  aria-label={t("editor.deleteLayer")}
                  className="ml-auto"
                  onClick={() => remove(selected.id)}
                >
                  <Trash size={13} />
                </Button>
              </div>
              {selected.type === "text" ? (
                <TextInspector layer={selected} onChange={patchSelected} />
              ) : (
                <Field label={t("editor.opacity")} htmlFor="logo-opacity">
                  <input
                    id="logo-opacity"
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    className="w-full accent-[var(--accent)]"
                    value={selected.opacity}
                    onChange={(e) => updateLayer({ ...selected, opacity: Number(e.target.value) })}
                  />
                </Field>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
