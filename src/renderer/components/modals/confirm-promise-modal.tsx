import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogProps,
  Button,
} from '@chakra-ui/react';
import { FocusableElement } from '@chakra-ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, ReactNode, useRef } from 'react';
import { create, InstanceProps } from 'react-modal-promise';

import { RippleButton } from '../buttons/ripple-button';
import { MotionBox } from '../motions/motion-box';

export type ConfirmPromiseModalProperties = {
  keyu: string;
  title?: string | ReactNode;
  size?: string;
  children?: ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColorScheme?: string;
} & InstanceProps<unknown>;

export const ConfirmPromiseModalComponent: FC<
  ConfirmPromiseModalProperties
> = ({
  keyu,
  isOpen = true,
  onResolve,
  onReject,
  title = 'Confirm',
  size = 'md',
  children,
  confirmButtonText = 'Yes',
  cancelButtonText = 'Cancel',
  confirmButtonColorScheme = 'red',
}) => {
  const cancelReference = useRef<FocusableElement>();

  const confirm = () => onResolve(true);
  const cancel = () => onReject();

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelReference}
      isCentered
      preserveScrollBarGap
      size={size}
      onClose={cancel}
      key={`confirm-alert-${keyu}`}
    >
      <AlertDialogOverlay>
        <AnimatePresence exitBeforeEnter>
          <motion.div
            initial={{ scaleX: 0.2, position: 'relative', opacity: 0.2 }}
            animate={{ scaleX: 1, opacity: 1, width: '100%' }}
            exit={{ scaleX: 0.2, opacity: 0.2 }}
            transition={{ duration: 0.3 }}
          >
            <AlertDialogContent
              overflow="hidden"
              rounded={10}
              shadow="sm"
              as={MotionBox}
              whileHover={{ y: -5 }}
              _hover={{ shadow: 'xl' }}
            >
              <AlertDialogHeader
                fontSize="lg"
                fontWeight="bold"
                bg="brand.200"
                color="white"
                as={MotionBox}
                py={3}
              >
                {title}
              </AlertDialogHeader>

              <AlertDialogBody py={4}>{children}</AlertDialogBody>

              <AlertDialogFooter py={4} pt={2}>
                <RippleButton
                  key={`cancel-${keyu}`}
                  ref={cancelReference}
                  onClick={cancel}
                  bgColor={{
                    step1: 'red.200',
                    step2: 'red.400',
                    step3: 'red.100',
                  }}
                >
                  {cancelButtonText}
                </RippleButton>
                <RippleButton
                  key={`confirm-${keyu}`}
                  onClick={confirm}
                  ml={3}
                  bgColor={{
                    step1: `${confirmButtonColorScheme}.200`,
                    step2: `${confirmButtonColorScheme}.600`,
                    step3: `${confirmButtonColorScheme}.100`,
                  }}
                >
                  {confirmButtonText}
                </RippleButton>
              </AlertDialogFooter>
            </AlertDialogContent>
          </motion.div>
        </AnimatePresence>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export const ConfirmPromiseModal = create(ConfirmPromiseModalComponent);
