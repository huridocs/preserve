import { EvidenceBase, EvidenceDB } from './QueueProcessor';

export type EvidenceResponse = EvidenceBase & { id: string; links: { self: string } };

export const Response = (evidence: EvidenceDB): EvidenceResponse => {
  return {
    id: evidence._id.toString(),
    tsa_files: evidence.tsa_files,
    attributes: {
      ...evidence.attributes,
      downloads: evidence.attributes.downloads.map(download => {
        return { ...download, path: `/evidences/${download.path}` };
      }),
    },
    links: {
      self: `/api/evidences/${evidence._id}`,
    },
  };
};
