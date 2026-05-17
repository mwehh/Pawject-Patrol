"use client";

import React from "react";
import { X, Sparkles, Search } from "lucide-react";

type PawfectMatchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function PawfectMatchModal({ isOpen, onClose }: PawfectMatchModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[10px] overflow-y-auto w-full max-w-[512px] sm:w-[512px] max-h-[95vh] relative px-[16px] sm:px-[24px] py-[17px] flex flex-col items-start gap-[10px] border-[0.8px] border-black/10 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: '"Genty Sans", sans-serif' }}
      >
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2 text-gray-800">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-xl sm:text-2xl font-bold">Find Your Perfect Match</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-gray-500 text-sm sm:text-base w-full">
          Describe your ideal companion in a few words.
        </p>

        <div className="flex flex-col items-center flex-1 w-full mt-2">
          <div className="border-2 border-gray-800 rounded-lg p-3 mb-4">
            <Sparkles className="w-8 h-8 text-gray-800" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            What's your ideal companion?
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Describe them in your own words
          </p>

          <textarea
            className="w-full h-32 p-4 border-2 border-gray-600 rounded-xl resize-none focus:outline-none focus:border-[#8D52A7] text-gray-700 font-sans"
            placeholder="A friendly dog, medium-sized, loves to play..."
          ></textarea>

          <div className="mt-4 flex flex-wrap justify-center gap-3 w-full">
            <span className="text-xs font-semibold text-gray-400 self-center">Examples:</span>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-md border border-[#8D52A7] text-[#8D52A7] hover:bg-[#8D52A7]/10 transition">small cat</button>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-md border border-[#DCB57E] text-[#DCB57E] hover:bg-[#DCB57E]/10 transition">calm dog</button>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-md border border-[#689668] text-[#689668] hover:bg-[#689668]/10 transition">playful</button>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-md border border-[#5E9BBA] text-[#5E9BBA] hover:bg-[#5E9BBA]/10 transition">family pet</button>
          </div>
        </div>

        <div className="mt-8 flex gap-4 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#8D52A7] text-[#8D52A7] font-semibold hover:bg-[#8D52A7]/10 transition focus:outline-none"
          >
            Skip
          </button>
          <button
            className="flex-1 py-3 rounded-xl bg-[#8D52A7] text-white font-semibold hover:bg-[#7F4A96] transition flex items-center justify-center gap-2 focus:outline-none"
          >
             <Search className="w-4 h-4" /> Find Matches
          </button>
        </div>
      </div>
    </div>
  );
}
