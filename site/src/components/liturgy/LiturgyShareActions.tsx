"use client";
import { ShareCardActions } from "@/components/sharing/VerseShare";
import { liturgyShareOptions, type LiturgyShareProps } from "./LiturgyShare";

export default function LiturgyShareActions(props: LiturgyShareProps) {
  return <ShareCardActions options={liturgyShareOptions(props)} daily />;
}
