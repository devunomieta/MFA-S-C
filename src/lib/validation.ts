export interface FileValidationOptions {
    maxSizeMB: number;
    allowedTypes: string[];
}

export function validateFile(file: File, options: FileValidationOptions): { isValid: boolean; error?: string } {
    const fileSizeMB = file.size / (1024 * 1024);

    if (fileSizeMB > options.maxSizeMB) {
        return {
            isValid: false,
            error: `File is too large. Maximum size is ${options.maxSizeMB}MB.`
        };
    }

    if (options.allowedTypes.length > 0 && !options.allowedTypes.includes(file.type)) {
        return {
            isValid: false,
            error: "Unsupported file type. Please upload a valid image or PDF."
        };
    }

    return { isValid: true };
}

export interface PasswordFeedback {
    score: number; // 0 to 4
    requirements: {
        length: boolean;
        uppercase: boolean;
        number: boolean;
        special: boolean;
    };
    isValid: boolean;
}

export function validatePassword(password: string): PasswordFeedback {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    };

    let score = 0;
    if (requirements.length) score++;
    if (requirements.uppercase) score++;
    if (requirements.number) score++;
    if (requirements.special) score++;

    return {
        score,
        requirements,
        isValid: score === 4,
    };
}
