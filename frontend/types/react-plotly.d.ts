declare module "react-plotly.js" {
  import { Component } from "react";

  interface PlotParams {
    data: Array<Record<string, unknown>>;
    layout?: Record<string, unknown>;
    frames?: Array<Record<string, unknown>>;
    config?: Record<string, unknown>;
    useResizeHandler?: boolean;
    style?: React.CSSProperties;
    className?: string;
    onInitialized?: (figure: { data: unknown[]; layout: unknown }, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: { data: unknown[]; layout: unknown }, graphDiv: HTMLElement) => void;
    onPurge?: (figure: { data: unknown[]; layout: unknown }, graphDiv: HTMLElement) => void;
    onError?: (err: Error) => void;
    onRelayout?: (event: Record<string, unknown>) => void;
    onClick?: (event: Record<string, unknown>) => void;
    onHover?: (event: Record<string, unknown>) => void;
    onUnhover?: (event: Record<string, unknown>) => void;
    onSelected?: (event: Record<string, unknown>) => void;
    revision?: number;
  }

  class Plot extends Component<PlotParams> {}

  export default Plot;
}
