import { Preservation, PreservationDB } from './Api';

type PreservationResponse = Preservation & { links: { self: string } };

export const Response = (preservation: PreservationDB): PreservationResponse => {
  return {
    id: preservation._id.toString(),
    attributes: {
      ...preservation.attributes,
      downloads: preservation.attributes.downloads.map(download => {
        return { ...download, path: `/preservations/${download.path}` };
      }),
    },
    links: {
      self: `/api/preservations/${preservation._id}`,
    },
  };
};
