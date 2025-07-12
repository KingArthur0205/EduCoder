"use client";
import { splitIntoSentences } from "@/app/_helpers/splitIntoSentences";
import Image from 'next/image';
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Essay {
  essay_id: string;
  grade: string;
  instructions: string;
  essay: string;
  excerpt: string;
  comment: string;
  tid: string;
  isRepresentative: string;
  comment_id: string;
  isRevisionRequested: "0" | "1";
  isCriticism: "0" | "1";
  isRevisionClear: "0" | "1";
  isPraise: "0" | "1";
  isBad: "0" | "1";
  levelOfInformation: string;
  revisionType: string;
  sentenceType: string;
  whoseIdeas: string;
  ideas: "0" | "1";
  organization: "0" | "1";
  voice: "0" | "1";
  word_choice: "0" | "1";
  sentence_fluency: "0" | "1";
  conventions: "0" | "1";
}

interface LabeledComment {
  sentences: string[];
  comment_id: string;
  excerpt: string;
  traits: string[];
  isrevisionrequested: string[];
  iscriticism: string[];
  isrevisionclear: string[];
  ispraise: string[];
  isbad: string[];
  levelofinformation: string[];
  revisiontype: string[];
  sentencetype: string[];
  whoseideas: string[];
}

const TRAITS = [
  "Ideas",
  "Organization",
  "Conventions",
  "Voice",
  "Word Choice",
  "Sentence Fluency",
];

export default function EssayReview() {
  const params = useParams<{ rater: string }>();
  const rater = params?.rater;
  //const router = useRouter();

  const [allEssays, setAllEssays] = useState<Essay[]>([]);
  const [essayIds, setEssayIds] = useState<string[]>([]);
  const [currentEssays, setCurrentEssays] = useState<Essay[]>([]);
  const [currentEssayId, setCurrentEssayId] = useState("");
  const [isEssayExpanded, setIsEssayExpanded] = useState(false);
  const [currentCommentIndex, setCurrentCommentIndex] = useState(0);
  const [labeledComments, setLabeledComments] = useState<LabeledComment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [isRevisionRequested, setIsRevisionRequested] = useState<string[]>([]);
  const [isRevisionClear, setIsRevisionClear] = useState<string[]>([]);
  const [isCriticism, setIsCriticism] = useState<string[]>([]);
  const [revisionType, setRevisionType] = useState<string[]>([]);
  const [isPraise, setIsPraise] = useState<string[]>([]);
  const [levelOfInfo, setLevelOfInfo] = useState<string[]>([]);
  const [whoseIdeas, setWhoseIdeas] = useState<string[]>([]);
  const [sentenceType, setSentenceType] = useState<string[]>([]);
  const [isBad, setIsBad] = useState<string[]>([]);

  useEffect(() => {
    const fetchEssays = async () => {
      try {
        const response = await fetch(`/api/sheets/${rater}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch essays: ${response.statusText}`);
        }
        const data = await response.json();
        const headers = data[0] as Array<keyof Essay>;
        const essays: Essay[] = data.slice(1).map((row: string[] & "0" & "1") => {
          const essay = {} as Essay;
          headers.forEach((header: keyof Essay, index: number) => {
            essay[header] = row[index];
          });
          return essay;
        });
        setEssayIds(essays.map((essay: Essay) => essay.essay_id));
        setCurrentEssayId(essays[0].essay_id);
        setCurrentEssays(
          essays.filter((essay) => essay.essay_id === essays[0].essay_id)
        );
        setAllEssays(essays);
        setError(null);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load essays";
        setError(errorMessage);
        console.error("Error fetching essays:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchEssays();
  }, [rater])

  const highlightExcerpt = (essay: string, excerpt: string) => {
    if (!excerpt.trim()) return essay;
    const escapedExcerpt = excerpt.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const regex = new RegExp(`(${escapedExcerpt})`, "gi");
    return essay.split(regex).map((part, index) =>
      regex.test(part) ? (
        <strong key={index} className="bg-yellow-200">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  const handleTraitChange = (index: number, trait: string) => {
    setSelectedTraits((prev) => {
      const newSelections = [...prev];
      newSelections[index] = trait;
      return newSelections;
    });
  };

  const handleIsRevisionRequestedChange = (index: number, response: string) => {
    setIsRevisionRequested((prev) => {
      const newSelections = [...prev];
      newSelections[index] = response;
      return newSelections;
    });
  };

  const handleIsCriticismChange = (index: number, response: string) => {
    setIsCriticism((prev) => {
      const newSelections = [...prev];
      newSelections[index] = response;
      return newSelections;
    });
  };

  const handleIsRevisionClearChange = (index: number, response: string) => {
    setIsRevisionClear((prev) => {
      const newSelections = [...prev];
      newSelections[index] = response;
      return newSelections;
    });
  };

  const handleRevisionTypeChange = (index: number, response: string) => {
    setRevisionType((prev) => {
      const newSelections = [...prev];
      newSelections[index] = response;
      return newSelections;
    });
  };

  const handleLevelOfInformationChange = (index: number, response: string) => {
    setLevelOfInfo((prev) => {
      const newSelections = [...prev];
      newSelections[index] = response;
      return newSelections;
    });
  };

  const handleSentenceTypeChange = (index: number, response: string) => {
    setSentenceType((prev) => {
      const newSelections = [...prev];
      newSelections[index] = response;
      return newSelections;
    });
  };

  const handleWhoseIdeasChange = (index: number, response: string) => {
    setWhoseIdeas((prev) => {
      const newSelections = [...prev];
      newSelections[index] = response;
      return newSelections;
    });
  };

  const handleIsPraiseChange = (index: number, response: string) => {
    setIsPraise((prev) => {
      const newSelections = [...prev];
      newSelections[index] = response;
      return newSelections;
    });
  };

  const handleIsBadChange = (index: number, response: string) => {
    setIsBad((prev) => {
      const newSelections = [...prev];
      newSelections[index] = response;
      return newSelections;
    });
  };

  const isCurrentCommentFullyLabeled = () => {
    const currentSentences = splitIntoSentences(
      currentEssays[currentCommentIndex]?.comment || ""
    );
    for (let index = 0; index < currentSentences.length; index++) {
      if (isRevisionRequested[index] == "" || isRevisionRequested[index] == null) {
        return(false)
      }
      if (isRevisionRequested[index] == "YES") {
        if (isCriticism[index] == "" || isCriticism[index] == null) {
          return(false);
        }
        if (isRevisionClear[index] == "" || isRevisionClear[index] == null) {
          return(false);
        }
        if (isRevisionClear[index] == "YES") {
          if(revisionType[index] == "" || revisionType[index] == null) {
            return(false);
          }
        }
        if (levelOfInfo[index] == "" || levelOfInfo[index] == null) {
          return(false);
        }
        if (whoseIdeas[index] == "" || whoseIdeas[index] == null) {
          return(false);
        }
      } else if(isRevisionRequested[index] == "NO") {
        if (isPraise[index] == "" || isPraise[index] == null) {
          return(false);
        }
        if (isPraise[index] == "YES") {
          if (levelOfInfo[index] == "" || levelOfInfo[index] == null) {
            return(false);
          }
        }
      }
      if(selectedTraits[index] == "" || selectedTraits[index] == null) {
        return(false);
      }
      if(sentenceType[index] == "" || sentenceType[index] == null) {
        return(false);
      }
      if(isBad[index] == "" || isBad[index] == null) {
        return(false);
      }
    }
    return(true);
  };

  const handleSubmit = async () => {
    if (!isCurrentCommentFullyLabeled() || isSubmitting) return;

    const currentComment = currentEssays[currentCommentIndex];
    const sentences = splitIntoSentences(currentComment.comment);
    const isLastComment = currentCommentIndex === currentEssays.length - 1;

    // For non-last comments, just update the state and move to next comment
    if (!isLastComment) {
      setLabeledComments((prev) => [
        ...prev,
        {
          sentences,
          traits: [...selectedTraits],
          isrevisionrequested: [...isRevisionRequested],
          iscriticism: [...isCriticism],
          isrevisionclear: [...isRevisionClear],
          ispraise: [...isPraise],
          isbad: [...isBad],
          revisiontype: [...revisionType],
          sentencetype: [...sentenceType],
          levelofinformation: [...levelOfInfo],
          whoseideas: [...whoseIdeas],
          comment_id: currentComment.comment_id,
          excerpt: currentComment.excerpt,
        },
      ]);
      setIsRevisionRequested([]);
      setIsCriticism([]);
      setIsRevisionClear([]);
      setRevisionType([]);
      setSelectedTraits([]);
      setIsPraise([]);
      setLevelOfInfo([]);
      setWhoseIdeas([]);
      setSentenceType([]);
      setIsBad([]);
      setCurrentCommentIndex((prev) => prev + 1);
      return;
    }

    // For the last comment, handle the final submission
    const confirmSubmit = window.confirm(
      `You are about to submit all labeled comments for Essay ${currentEssayId}. This action cannot be undone. Would you like to proceed?`
    );

    if (confirmSubmit) {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch(`/api/sheets/${rater}/annotate`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            essayId: currentEssayId,
            labeledComments: [
              ...labeledComments,
              {
                sentences,
                traits: [...selectedTraits],
                isrevisionrequested: [...isRevisionRequested],
                iscriticism: [...isCriticism],
                isrevisionclear: [...isRevisionClear],
                ispraise: [...isPraise],
                isbad: [...isBad],
                revisiontype: [...revisionType],
                sentencetype: [...sentenceType],
                levelofinformation: [...levelOfInfo],
                whoseideas: [...whoseIdeas],
                comment_id: currentComment.comment_id,
                excerpt: currentComment.excerpt,
                comment: currentComment.comment,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to submit labels: ${response.statusText}`);
        }

        // Only update state after successful submission
        const essayIdsUpdate = essayIds.filter(
          (essayId) => essayId !== currentEssayId
        );

        const newCurrentEssayId = essayIdsUpdate[0];

        setEssayIds(essayIdsUpdate);
        setCurrentEssayId(newCurrentEssayId);
        setCurrentEssays(
          allEssays.filter((essay) => essay.essay_id === newCurrentEssayId)
        );
        setCurrentCommentIndex(0);
        setLabeledComments([]);
        setIsRevisionRequested([]);
        setIsCriticism([]);
        setIsRevisionClear([]);
        setRevisionType([]);
        setSelectedTraits([]);
        setIsPraise([]);
        setLevelOfInfo([]);
        setWhoseIdeas([]);
        setSentenceType([]);
        setIsBad([]);
        setError(null);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to submit labels";
        setError(errorMessage);
        console.error("Error updating sheet:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-teal-400"></div>
        <p className="mb-4 mt-8 text-gray-700 text-left">Loading... If this takes longer than a minute, try going back or refreshing.</p>
        </div>
      </div>
    );
  }

  if (currentEssays.length == 0) {
    return(
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="flex flex-col items-center">
        <div className="flex justify-center mb-4"> {/* Center the image */}
          <div className="w-full max-w-xs"> {/* Adjust max-width as needed */}
            <Image
              src={"/stanford-gse.png"}
              layout="responsive"
              width={4}
              height={3}
              className="max-w-full h-auto"
              alt="Stanford Graduate School of Education Logo"
            />
          </div>
        </div>
        <h1 className='text-3xl mb-4 p-4 text-gray-900 text-center'>All done!</h1>
        <p className="mb-4 text-gray-700 text-lg text-center">Thank you for participating in our study -- we will be in touch soon either with a next step or with your gift card.</p>
        <p className="mb-4 text-gray-700 text-lg text-center">Please reach out to mxtan@stanford.edu with any questions!</p>
      </div>
      </div>
    );
  }

  const currentEssay = currentEssays[currentCommentIndex];
  if (!currentEssay) return <div>Loading...</div>;

  const currentSentences = splitIntoSentences(currentEssay.comment);
  const isSubmitEnabled = isCurrentCommentFullyLabeled() && !isSubmitting;
  const isLastComment = currentCommentIndex === currentEssays.length - 1;
  const totalEssayCount = new Set(allEssays.map((essay) => essay.essay_id))
    .size;

  const remainingEssayCount = new Set(essayIds).size;
  const completedEssays = totalEssayCount - remainingEssayCount;

  const progressPercentage = (completedEssays / totalEssayCount) * 100;

  return (
    <div className="mx-auto p-6 bg-gray-50 min-h-screen">
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
          role="alert"
        >
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-m text-gray-600">
            Essays completed: {completedEssays} of {totalEssayCount}
          </span>
          <span className="text-m text-gray-600">
            {progressPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#009AB4] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 text-right">
          Essay {currentEssayId} - Comment {currentCommentIndex + 1} of{" "}
          {currentEssays.length}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
        <button
          onClick={() => setIsEssayExpanded(!isEssayExpanded)}
          className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold text-gray-700">{`Essay ${currentEssay.essay_id}`}</span>
          <span className="text-2xl text-gray-500">
            {isEssayExpanded ? "−" : "+"}
          </span>
        </button>
        {isEssayExpanded && (
          <div className="p-4 border-t border-gray-100">
            <p className="whitespace-pre-wrap text-gray-500 italic">
              Writing Prompt: {currentEssay.instructions}
            </p>
            <div className="border-t border-gray-200 my-4"></div>
            <p className="whitespace-pre-wrap text-gray-600">
              {highlightExcerpt(currentEssay.essay, currentEssay.excerpt)}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <p className="text-gray-700 text-lg mb-4 border-b pb-6">
          <span className="not-italic">Excerpt:</span> <span className="bg-yellow-200 px-1 font-bold rounded">{currentEssay.excerpt}</span>
        </p>

        <div className="space-y-4 pt-4">
          {currentSentences.map((sentence, index) => (
            <div key={index} className="flex items-start justify-between border-b pb-6">
              {currentSentences.length > 1 &&
                <p className="text-gray-700 text-lg w-1/2"><span className="not-italic">Comment Part {index + 1}:</span> <span className="bg-[#e6f5f8] px-1 rounded">{sentence.trim()}</span></p>
              }
              {currentSentences.length == 1 &&
                <p className="text-gray-700 text-lg w-1/2"><span className="not-italic">Comment:</span> <span className="bg-[#e6f5f8] px-1 rounded">{sentence.trim()}</span></p>
              }
              <div className="flex flex-col space-y-2 items-start w-1/3 text-gray-700">
                <p className="pt-4">Is a revision requested?</p>
                <div><input type="radio" name={`revision-${index}`} value="YES" 
                  style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                  onChange={() => handleIsRevisionRequestedChange(index, "YES")}
                  checked={isRevisionRequested[index] === "YES"}/> <span>YES</span></div>
                <div><input type="radio" name={`revision-${index}`} value="NO" 
                  style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                  onChange={() => handleIsRevisionRequestedChange(index, "NO")}
                  checked={isRevisionRequested[index] === "NO"}/> <span>NO</span></div>
                {isRevisionRequested[index] == "YES" &&
                  <div className="flex flex-col space-y-2 items-start">
                    <p className="pt-4">Is the feedback criticism?</p>
                    <div><input type="radio" name={`criticism-${index}`} value="YES" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleIsCriticismChange(index, "YES")}/> <span>YES</span></div>
                    <div><input type="radio" name={`criticism-${index}`} value="NO" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleIsCriticismChange(index, "NO")}/> <span>NO</span></div>
                    <p className="pt-4">Is the feedback actionable?</p>
                    <div><input type="radio" name={`actionable-${index}`} value="YES" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleIsRevisionClearChange(index, "YES")}/> <span>YES</span></div>
                    <div><input type="radio" name={`actionable-${index}`} value="NO" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleIsRevisionClearChange(index, "NO")}/> <span>NO</span></div>
                    {isRevisionClear[index] == "YES" &&
                      <div className="flex flex-col space-y-2 items-start">
                        <p className="pt-4">What kind of revision is requested?</p>
                        <div><input type="radio" name={`revtype-${index}`} value="Problem" 
                          style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                          onChange={() => handleRevisionTypeChange(index, "Add")}/> <span>Add</span></div>
                        <div><input type="radio" name={`revtype-${index}`} value="Problem" 
                          style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                          onChange={() => handleRevisionTypeChange(index, "Modify")}/> <span>Modify</span></div>
                        <div><input type="radio" name={`revtype-${index}`} value="Problem" 
                          style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                          onChange={() => handleRevisionTypeChange(index, "Delete")}/> <span>Delete</span></div>
                      </div>
                    }
                    <p className="pt-4">What level of information is given?</p>
                    <div><input type="radio" name={`loi-${index}`} value="Problem" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleLevelOfInformationChange(index, "Problem")}/> <span>Problem</span></div>
                    <div><input type="radio" name={`loi-${index}`} value="Elaboration of Problem" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleLevelOfInformationChange(index, "Elaboration of Problem")}/> <span>Elaboration of Problem</span></div>
                    <div><input type="radio" name={`loi-${index}`} value="Scaffolding towards Solution" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleLevelOfInformationChange(index, "Scaffolding towards Solution")}/> <span>Scaffolding towards Solution</span></div>
                    <div><input type="radio" name={`loi-${index}`} value="Solution" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleLevelOfInformationChange(index, "Solution")}/> <span>Solution</span></div>
                    <div><input type="radio" name={`loi-${index}`} value="Elaboration of Solution" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleLevelOfInformationChange(index, "Elaboration of Solution")}/> <span>Elaboration of Solution</span></div>
                    <p className="pt-4">Who is the authority on this writing?</p>
                    <div><input type="radio" name={`ideas-${index}`} value="Student" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleWhoseIdeasChange(index, "Student")}/> <span>Student</span></div>
                    <div><input type="radio" name={`ideas-${index}`} value="Teacher" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleWhoseIdeasChange(index, "Somewhat Student")}/> <span>More Student than Teacher</span></div>
                    <div><input type="radio" name={`ideas-${index}`} value="Teacher" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleWhoseIdeasChange(index, "Somewhat Teacher")}/> <span>More Teacher than Student</span></div>
                    <div><input type="radio" name={`ideas-${index}`} value="Teacher" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleWhoseIdeasChange(index, "Teacher")}/> <span>Teacher</span></div>
                  </div>
                }
                {isRevisionRequested[index] == "NO" &&
                  <div className="flex flex-col space-y-2 items-start">
                    <p className="pt-4">Is the feedback praise?</p>
                    <div><input type="radio" name={`praise-${index}`} value="YES" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleIsPraiseChange(index, "YES")}/> <span>YES</span></div>
                    <div><input type="radio" name={`praise-${index}`} value="NO" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleIsPraiseChange(index, "NO")}/> <span>NO</span></div>
                    {isPraise[index] == "YES" &&
                      <div className="flex flex-col space-y-2 items-start">
                        <p className="pt-4">What level of information is given?</p>
                          <div><input type="radio" name={`loi-${index}`} value="Praise" 
                            style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                            onChange={() => handleLevelOfInformationChange(index, "Praise")}/> <span>Praise</span></div>
                          <div><input type="radio" name={`loi-${index}`} value="Elaboration of Praise" 
                            style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                            onChange={() => handleLevelOfInformationChange(index, "Elaboration of Praise")}/> <span>Elaboration of Praise</span></div>
                      </div>
                    }
                  </div>
                }
                {isRevisionRequested[index] != null &&
                  <div className="flex flex-col space-y-2 items-start">
                    <p className="pt-4">What trait does the revision target?</p>
                    <select
                      className="border border-gray-300 p-2 rounded-lg text-gray-700"
                      value={selectedTraits[index] || ""}
                      onChange={(e) => handleTraitChange(index, e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="">Select Trait</option>
                      {TRAITS.map((trait) => (
                        <option key={trait} value={trait}>
                          {trait}
                        </option>
                      ))}
                    </select>
                    <p className="pt-4">What is the form of the feedback?</p>
                    <div><input type="radio" name={`form-${index}`} value="Problem" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleSentenceTypeChange(index, "EStatement")}/> <span>Evaluative Statement</span></div>
                    <div><input type="radio" name={`form-${index}`} value="Problem" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleSentenceTypeChange(index, "NEStatement")}/> <span>Non-Evaluative Statement</span></div>
                    <div><input type="radio" name={`form-${index}`} value="Problem" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleSentenceTypeChange(index, "Question")}/> <span>Question</span></div>
                    <div><input type="radio" name={`form-${index}`} value="Problem" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleSentenceTypeChange(index, "Command")}/> <span>Command / Directive</span></div>
                    <p className="pt-4">Is it bad feedback?</p>
                    <div><input type="radio" name={`bad-${index}`} value="YES" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleIsBadChange(index, "YES")}/> <span>YES</span></div>
                    <div><input type="radio" name={`bad-${index}`} value="NO" 
                      style={{ marginLeft: '5px', accentColor: '#009AB4' }}
                      onChange={() => handleIsBadChange(index, "NO")}/> <span>NO</span></div>
                  </div>
                }
              </div>
  
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSubmit}
            disabled={!isSubmitEnabled}
            className={`px-6 py-2 mt-10 rounded-lg transition-colors flex items-center ${
              isSubmitEnabled
                ? "bg-[#009AB4] text-white hover:bg-[#006c7e]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSubmitting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {isSubmitting
              ? "Submitting..."
              : isLastComment
              ? "Submit All Labels"
              : "Next Comment"}
          </button>
        </div>
      </div>

      {labeledComments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-l font-bold mb-4 text-gray-800">
            Previous Comments
          </h2>
          {labeledComments.map((comment) => (
            <div key={comment.comment_id} className="py-4 last:mb-0 border-t">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-500 italic">
                  <span className="not-italic">Excerpt:</span> {comment.excerpt}
                </div>
              </div>
              {comment.sentences.map((sentence, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between mb-2"
                >
                  <p className="text-sm text-gray-600 w-3/4">
                    {sentence.trim()}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
