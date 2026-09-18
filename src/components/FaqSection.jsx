import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function FaqSection({ faqs = [] }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 bg-cream border-t border-zinc-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-8">
          <span className="text-xs font-bold tracking-[0.28em] text-orange-600 uppercase">
            FAQS
          </span>
          <h2 className="mt-2 font-display text-4xl sm:text-5xl lg:text-6xl text-zinc-900 tracking-tight leading-none">
            MEHRBAN FAST FOOD <span className="text-orange-600">LAHORE</span> — QUESTIONS
          </h2>
          <p className="mt-4 text-zinc-600 text-sm leading-relaxed">
            Mehrban Fast Food is a fast food restaurant at Shaikh Chowk, Itfaq Town, Mansoora Bazar on Main Multan Road, Lahore. Browse the{' '}
            <a href="#menu" className="font-semibold text-orange-600 underline-offset-4 hover:underline">
              Mehrban Fast Food menu
            </a>
            , check the{' '}
            <a href="#deals" className="font-semibold text-orange-600 underline-offset-4 hover:underline">
              combo deals
            </a>{' '}
            or{' '}
            <a href="#contact" className="font-semibold text-orange-600 underline-offset-4 hover:underline">
              contact Mehrban Fast Food
            </a>{' '}
            for home delivery in nearby Lahore areas.
          </p>
        </div>

        {/* Accordions */}
        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="font-display text-xl sm:text-2xl text-zinc-900 tracking-wide">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-500 transition-transform duration-300 flex-shrink-0 ${
                      isOpen ? 'rotate-180 text-orange-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-zinc-600 text-sm leading-relaxed border-t border-zinc-100 animate-in fade-in duration-200">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
