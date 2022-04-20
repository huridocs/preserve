import { Evidence, EvidenceDB } from './Api';

type EvidenceResponse = Evidence & { links: { self: string } };

export const Response = (evidence: EvidenceDB): EvidenceResponse => {
  return {
    id: evidence._id.toString(),
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
