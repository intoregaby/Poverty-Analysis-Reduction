import React from "react";
import ReactMarkdown from "react-markdown";

const components = {
  p: (props) => <p className="mt-2 text-[12.5px] leading-[1.7] text-ink first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5 text-[12.5px] leading-[1.65] text-ink marker:text-brand" {...props} />,
  ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12.5px] leading-[1.65] text-ink" {...props} />,
  strong: (props) => <strong className="font-semibold text-ink" {...props} />,
  a: (props) => <a target="_blank" rel="noreferrer" className="text-brand underline" {...props} />,
};

export default function Markdown({ children }) {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
