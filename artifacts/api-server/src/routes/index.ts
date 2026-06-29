import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiChatRouter from "./openai-chat";
import stripeRouter from "./stripe";
import extractDocumentRouter from "./extract-document";
import scanStatementRouter from "./scan-statement";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiChatRouter);
router.use(stripeRouter);
router.use(extractDocumentRouter);
router.use(scanStatementRouter);

export default router;
