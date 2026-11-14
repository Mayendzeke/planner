import { Component, type ErrorInfo, type ReactNode } from "react";
import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";

type ViewerErrorBoundaryProps = { children: ReactNode };
type ViewerErrorBoundaryState = { hasError: boolean };

class ViewerErrorBoundary extends Component<ViewerErrorBoundaryProps, ViewerErrorBoundaryState> {
  state: ViewerErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ViewerErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("StudySpace PowerPoint preview could not render this file.", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="library-viewer-unsupported" role="alert">
          <strong>This presentation could not be rendered here.</strong>
          <p>The original file is still available from the Download button above. Open it in PowerPoint or another compatible presentation app for the complete experience.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PowerPointDocumentViewer({ file }: { file: Blob }) {
  return (
    <div className="library-powerpoint-viewer">
      <div className="library-preview-note">
        <span aria-hidden="true">▣</span>
        <span>PowerPoint preview · Browse slides, use the thumbnail rail, search supported text and adjust zoom. Embedded pictures and supported slide elements render in place. Animations and some advanced PowerPoint effects may appear as static content.</span>
      </div>
      <div className="library-powerpoint-viewer-stage">
        <ViewerErrorBoundary>
          <ReactPptxViewer
            source={file}
            mode="continuous"
            defaultZoom="fit-width"
            showThumbnails
            showToolbar
            showDiagnostics
          />
        </ViewerErrorBoundary>
      </div>
    </div>
  );
}
