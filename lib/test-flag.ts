/** The record kinds set_record_test (migration 0059) knows how to flip with their attachments. */
export const RECORD_KINDS = ["campaign", "event", "fundraiser", "team", "supporter", "beneficiary", "proposal"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];
