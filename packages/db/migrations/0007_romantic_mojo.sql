CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`sub_title` text,
	`description` text NOT NULL,
	`image_url` text,
	`href` text,
	`link_title` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "products_status_check" CHECK("products"."status" IN ('draft', 'published'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_products_status_sort` ON `products` (`status`,`sort_order`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`image_url` text,
	`href` text,
	`link_title` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "services_status_check" CHECK("services"."status" IN ('draft', 'published'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `services_slug_unique` ON `services` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_services_status_sort` ON `services` (`status`,`sort_order`);--> statement-breakpoint
-- トップページ#idea(Product)・#serviceセクションの初期データ。既存の静的マークアップ
-- （apps/web/src/render/pages/top.tsx移行前の内容）をそのままDBへ書き起こしたもの。
INSERT INTO `products` (`slug`, `status`, `sort_order`, `title`, `sub_title`, `description`, `image_url`, `href`, `link_title`) VALUES
('meet', 'published', 0, 'Meet', '出会いやつながりを求める人のためのどこでも相席アプリ', '「Meet」は18～30歳の若者を対象に、同じ趣味や食事仲間、異性との出会いを提供するマッチングサービス。人集め・日程調整・店選びの手間を省き、企画者が設定したイベントに参加者が応募する仕組みで、スムーズな出会いを実現。提携飲食店を会場とすることで、店舗の集客支援とマネタイズも可能にします。', '/image/idea-meet-image.png', NULL, NULL),
('feereal', 'published', 1, 'FeeReal', '感情のインスタントシェアアプリ', '「FeeReal」はユーザーが感情に関する問いかけに直感的に回答し、その結果を簡潔なビジュアルイメージとして各種SNSで簡単にシェアできます。これにより、言葉にしにくい感情を気軽に共有し、コミュニケーションにおける「温度感」のズレをなくすことを目指しています。', '/image/idea-feereal-image.png', NULL, NULL),
('rough-letter', 'published', 2, 'Rough Letter', 'ビジネスチャンスを逃さない。メール文化に革命を。', '「Rough Letter」は、名刺交換後の会話内容を記録し、AIが自動でメールの下書きを作成する営業支援サービス。スタートアップやビジネスマン向けに、効率的なフォローアップを実現。添付ファイルや訴求内容も自動反映し、人別に整理されたチャット型UIで見逃し防止と返信サポートも提供します。', '/image/idea-roughletter-image.png', NULL, NULL);
--> statement-breakpoint
INSERT INTO `services` (`slug`, `status`, `sort_order`, `title`, `description`, `image_url`, `href`, `link_title`) VALUES
('ui-ux-design', 'published', 0, 'UI / UX デザイン', 'ユーザー視点を重視し、使いやすく魅力的なデザインを提供。優れた操作性を実現し、Web・アプリの価値を高めます。ユーザビリティ調査から設計まで一貫して対応します。', '/image/service-design-img.png', NULL, NULL),
('web-site', 'published', 1, 'Webサイト制作', '企業や個人の目的に合わせたWebサイトを設計・構築。デザイン性と機能性を両立し、SEOやモバイル対応も考慮。要件定義から運用サポートまで幅広く対応します。', '/image/service-web-img.png', NULL, NULL),
('system-dev', 'published', 2, 'システム開発', '業務効率化や新規サービスの実現に向け、最適なシステムを開発。Webアプリや業務システム、API連携など、要件に応じた柔軟な設計・実装を行います。', '/image/service-system-img.png', NULL, NULL),
('video-3dcg', 'published', 3, '映像・3DCG', 'キャラクターモデリングやプロダクトデザインなど、高品質な3DCGを制作。ゲームや映像、VR/ARなど幅広い分野に対応し、視覚的に魅力あるコンテンツを提供します。', '/image/service-3dcg-img.png', NULL, NULL),
('seminar-workshop', 'published', 4, 'セミナー・ワークショップ', 'プログラミングやデザインなど、専門スキルを指導。初心者から実務レベルまで対応し、学習者の目標に合わせたカリキュラムを提供します。企業研修や個別指導も可能です。', '/image/service-education-img.jpg', '/service/seminar/', 'セミナー・ワークショップ'),
('pm', 'published', 5, 'マネージャー業務', '開発プロジェクトの進行管理や品質管理を担当。要件定義からスケジュール調整、チームビルディングまで、円滑なプロジェクト運営をサポートします。', '/image/service-pm-img.png', NULL, NULL);