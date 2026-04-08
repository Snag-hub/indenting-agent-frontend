import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

export interface StepConfig {
  title: string
  description?: string
}

export interface MultiStepFormProps {
  steps: StepConfig[]
  currentStep: number
  onNext: () => void
  onBack: () => void
  onSubmit: () => void
  isSubmitting?: boolean
  canProceed?: boolean
  submitLabel?: string
  children: React.ReactNode
}

export function MultiStepForm({
  steps,
  currentStep,
  onNext,
  onBack,
  onSubmit,
  isSubmitting = false,
  canProceed = true,
  submitLabel = 'Submit',
  children,
}: MultiStepFormProps) {
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Progress Bar */}
      <div className="space-y-4">
        {/* Circles and horizontal connectors */}
        <div className="flex items-center justify-between">
          {steps.map((_, index) => (
            <div key={index} className="flex flex-1 items-center">
              {/* Circle */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-semibold ${index < currentStep
                  ? 'border-green-500 bg-green-500 text-white'
                  : index === currentStep
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-300 bg-white text-gray-400'
                  }`}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
              {/* Horizontal Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 mx-2 h-0.5 ${index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Titles below */}
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex-1 text-center">
              <p
                className={`text-sm font-medium ${index === currentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}
              >
                {step.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Step Description */}
      {steps[currentStep].description && (
        <p className="text-sm text-gray-600">{steps[currentStep].description}</p>
      )}

      {/* Step Content */}
      <div className="min-h-96 rounded-lg border border-gray-200 bg-white p-6">
        {children}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isFirstStep}
          className={isFirstStep ? 'invisible' : ''}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-2">
          {!isLastStep ? (
            <Button onClick={onNext} disabled={!canProceed}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
