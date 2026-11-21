export function PdfPreview({ uri, onError }: { uri: string; onError: () => void }) {
  return <iframe title="PDF preview" src={uri} onError={onError} style={{ flex: 1, width: '100%', border: 0 }} />;
}
